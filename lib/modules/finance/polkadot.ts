import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";

export interface PolkadotWalletBalance {
  address: string;
  free: number;
  reserved: number;
  frozen: number;
  totalDot: number;
  usdValue: number;
  assets: AssetHubToken[];
}

export interface AssetHubToken {
  assetId: number;
  symbol: string;
  balance: number;
  decimals: number;
  usdValue: number;
}

export interface PolkadotPortfolio {
  wallets: PolkadotWalletBalance[];
  dotPrice: number;
  totalDot: number;
  totalUsd: number;
}

const DOT_DECIMALS = 10;
const QUERY_TIMEOUT_MS = 20_000;

const ASSET_HUB_ENDPOINT = "wss://polkadot-asset-hub-rpc.polkadot.io";

const KNOWN_ASSETS: { id: number; symbol: string; decimals: number; stablecoin: boolean }[] = [
  { id: 1984, symbol: "USDT", decimals: 6, stablecoin: true },
  { id: 1337, symbol: "USDC", decimals: 6, stablecoin: true },
];

async function fetchDotPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=DOTUSDT"
    );
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

let cachedResult: { data: PolkadotPortfolio; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function fetchPolkadotBalances(
  addresses: string[]
): Promise<PolkadotPortfolio> {
  if (!addresses.length) {
    return { wallets: [], dotPrice: 0, totalDot: 0, totalUsd: 0 };
  }

  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    return cachedResult.data;
  }

  const dotPrice = await fetchDotPrice();

  const provider = getWsProvider({
    endpoints: [ASSET_HUB_ENDPOINT],
    innerEnhancer: withPolkadotSdkCompat,
  });

  const suppressedErrors = new Set(["Not connected", "ECONNREFUSED"]);
  const onUncaught = (err: Error) => {
    if (suppressedErrors.has(err?.message)) return;
    throw err;
  };
  process.on("uncaughtException", onUncaught);

  const client = createClient(provider);

  const wallets: PolkadotWalletBalance[] = [];

  try {
    const unsafeApi = client.getUnsafeApi();

    for (const address of addresses) {
      try {
        const accountInfo = await withTimeout(
          unsafeApi.query.System.Account.getValue(address),
          QUERY_TIMEOUT_MS,
          `Account query for ${address.slice(0, 8)}...`
        );
        const data = accountInfo.data as Record<string, unknown>;
        const free = Number(data.free ?? 0) / Math.pow(10, DOT_DECIMALS);
        const reserved = Number(data.reserved ?? 0) / Math.pow(10, DOT_DECIMALS);
        const frozen = Number(data.frozen ?? 0) / Math.pow(10, DOT_DECIMALS);
        const totalDot = free + reserved;

        const assets: AssetHubToken[] = [];
        for (const knownAsset of KNOWN_ASSETS) {
          try {
            const assetAccount = await withTimeout(
              unsafeApi.query.Assets.Account.getValue(knownAsset.id, address),
              QUERY_TIMEOUT_MS,
              `Asset ${knownAsset.symbol} query`
            );
            if (assetAccount) {
              const rec = assetAccount as unknown as Record<string, unknown>;
              const balance =
                Number(rec.balance ?? 0) / Math.pow(10, knownAsset.decimals);
              if (balance > 0) {
                assets.push({
                  assetId: knownAsset.id,
                  symbol: knownAsset.symbol,
                  balance,
                  decimals: knownAsset.decimals,
                  usdValue: knownAsset.stablecoin ? balance : 0,
                });
              }
            }
          } catch {
            // asset not found or timed out
          }
        }

        wallets.push({
          address,
          free,
          reserved,
          frozen,
          totalDot,
          usdValue: totalDot * dotPrice + assets.reduce((s, a) => s + a.usdValue, 0),
          assets,
        });
      } catch {
        wallets.push({
          address,
          free: 0,
          reserved: 0,
          frozen: 0,
          totalDot: 0,
          usdValue: 0,
          assets: [],
        });
      }
    }
  } finally {
    client.destroy();
    setTimeout(() => process.removeListener("uncaughtException", onUncaught), 5_000);
  }

  const totalDot = wallets.reduce((s, w) => s + w.totalDot, 0);
  const totalAssetUsd = wallets.reduce(
    (s, w) => s + w.assets.reduce((a, t) => a + t.usdValue, 0),
    0
  );
  const result: PolkadotPortfolio = {
    wallets,
    dotPrice,
    totalDot,
    totalUsd: totalDot * dotPrice + totalAssetUsd,
  };

  cachedResult = { data: result, timestamp: Date.now() };
  return result;
}
