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
}

export interface PolkadotPortfolio {
  wallets: PolkadotWalletBalance[];
  dotPrice: number;
  totalDot: number;
  totalUsd: number;
}

const DOT_DECIMALS = 10;

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

export async function fetchPolkadotBalances(
  addresses: string[]
): Promise<PolkadotPortfolio> {
  if (!addresses.length) {
    return { wallets: [], dotPrice: 0, totalDot: 0, totalUsd: 0 };
  }

  const dotPrice = await fetchDotPrice();

  const provider = getWsProvider({
    endpoints: ["wss://rpc.polkadot.io"],
    innerEnhancer: withPolkadotSdkCompat,
  });
  const client = createClient(provider);

  const wallets: PolkadotWalletBalance[] = [];

  try {
    const unsafeApi = client.getUnsafeApi();

    for (const address of addresses) {
      try {
        const accountInfo = await unsafeApi.query.System.Account.getValue(
          address
        );
        const data = accountInfo.data as Record<string, unknown>;
        const free = Number(data.free ?? 0) / Math.pow(10, DOT_DECIMALS);
        const reserved = Number(data.reserved ?? 0) / Math.pow(10, DOT_DECIMALS);
        const frozen = Number(data.frozen ?? 0) / Math.pow(10, DOT_DECIMALS);
        const totalDot = free + reserved;

        wallets.push({
          address,
          free,
          reserved,
          frozen,
          totalDot,
          usdValue: totalDot * dotPrice,
        });
      } catch {
        wallets.push({
          address,
          free: 0,
          reserved: 0,
          frozen: 0,
          totalDot: 0,
          usdValue: 0,
        });
      }
    }
  } finally {
    client.destroy();
  }

  const totalDot = wallets.reduce((s, w) => s + w.totalDot, 0);
  return {
    wallets,
    dotPrice,
    totalDot,
    totalUsd: totalDot * dotPrice,
  };
}
