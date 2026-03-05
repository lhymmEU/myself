import { MainClient } from "binance";

export interface AssetBalance {
  asset: string;
  free: number;
  locked: number;
  usdValue: number;
}

export interface EarnPosition {
  asset: string;
  amount: number;
  usdValue: number;
  type: "flexible" | "locked";
  productName?: string;
}

export interface BinancePortfolio {
  spot: AssetBalance[];
  funding: AssetBalance[];
  earn: EarnPosition[];
  totalUsd: number;
}

export interface TickerInfo {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

function createClient(apiKey: string, apiSecret: string): MainClient {
  return new MainClient({
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

function createPublicClient(): MainClient {
  return new MainClient();
}

async function getPriceMap(client: MainClient): Promise<Record<string, number>> {
  const prices = await client.getSymbolPriceTicker();
  const map: Record<string, number> = {};
  if (Array.isArray(prices)) {
    for (const p of prices) {
      map[p.symbol] = parseFloat(String(p.price));
    }
  }
  return map;
}

function estimateUsdValue(
  asset: string,
  amount: number,
  priceMap: Record<string, number>
): number {
  if (amount === 0) return 0;
  const stables = ["USDT", "USDC", "BUSD", "TUSD", "FDUSD", "DAI"];
  if (stables.includes(asset)) return amount;
  const usdtPair = `${asset}USDT`;
  if (priceMap[usdtPair]) return amount * priceMap[usdtPair];
  const busdPair = `${asset}BUSD`;
  if (priceMap[busdPair]) return amount * priceMap[busdPair];
  return 0;
}

export async function fetchBinancePortfolio(
  apiKey: string,
  apiSecret: string
): Promise<BinancePortfolio> {
  const client = createClient(apiKey, apiSecret);
  const priceMap = await getPriceMap(client);

  const [accountInfo, fundingAssets, flexEarn, lockedEarn] = await Promise.allSettled([
    client.getBalances(),
    client.getFundingAsset({}),
    client.getFlexibleProductPosition({ asset: "" }),
    client.getLockedProductPosition({}),
  ]);

  const spot: AssetBalance[] = [];
  if (accountInfo.status === "fulfilled" && Array.isArray(accountInfo.value)) {
    for (const b of accountInfo.value) {
      const rec = b as unknown as Record<string, unknown>;
      const asset = String(rec.asset ?? "");
      const free = parseFloat(String(rec.free ?? 0));
      const locked = parseFloat(String(rec.locked ?? 0));
      if (free + locked > 0) {
        spot.push({
          asset,
          free,
          locked,
          usdValue: estimateUsdValue(asset, free + locked, priceMap),
        });
      }
    }
  }

  const funding: AssetBalance[] = [];
  if (fundingAssets.status === "fulfilled" && Array.isArray(fundingAssets.value)) {
    for (const f of fundingAssets.value) {
      const free = parseFloat(String(f.free));
      const locked = parseFloat(String(f.locked));
      if (free + locked > 0) {
        funding.push({
          asset: f.asset,
          free,
          locked,
          usdValue: estimateUsdValue(f.asset, free + locked, priceMap),
        });
      }
    }
  }

  const earn: EarnPosition[] = [];
  if (flexEarn.status === "fulfilled") {
    const rows = (flexEarn.value as { rows?: unknown[] })?.rows;
    if (Array.isArray(rows)) {
      for (const r of rows as Record<string, unknown>[]) {
        const amount = parseFloat(String(r.totalAmount ?? 0));
        const asset = String(r.asset ?? "");
        if (amount > 0) {
          earn.push({
            asset,
            amount,
            usdValue: estimateUsdValue(asset, amount, priceMap),
            type: "flexible",
            productName: String(r.productId ?? ""),
          });
        }
      }
    }
  }

  if (lockedEarn.status === "fulfilled") {
    const rows = (lockedEarn.value as { rows?: unknown[] })?.rows;
    if (Array.isArray(rows)) {
      for (const r of rows as Record<string, unknown>[]) {
        const amount = parseFloat(String(r.amount ?? 0));
        const asset = String(r.asset ?? "");
        if (amount > 0) {
          earn.push({
            asset,
            amount,
            usdValue: estimateUsdValue(asset, amount, priceMap),
            type: "locked",
            productName: String(r.productId ?? ""),
          });
        }
      }
    }
  }

  const totalUsd =
    spot.reduce((s, a) => s + a.usdValue, 0) +
    funding.reduce((s, a) => s + a.usdValue, 0) +
    earn.reduce((s, a) => s + a.usdValue, 0);

  return { spot, funding, earn, totalUsd };
}

const TOP_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "DOTUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
  "NEARUSDT", "ATOMUSDT", "LTCUSDT", "UNIUSDT", "AAVEUSDT",
  "SUIUSDT", "APTUSDT", "ARBUSDT", "OPUSDT", "INJUSDT",
];

export async function fetchMarketTickers(
  symbols?: string[]
): Promise<TickerInfo[]> {
  const client = createPublicClient();
  const targetSymbols = symbols ?? TOP_SYMBOLS;
  const allTickers = await client.get24hrChangeStatistics({ type: "MINI" });

  const tickers: TickerInfo[] = [];
  if (Array.isArray(allTickers)) {
    for (const t of allTickers) {
      if (targetSymbols.includes(String(t.symbol))) {
        const rec = t as unknown as Record<string, unknown>;
        tickers.push({
          symbol: String(t.symbol),
          price: parseFloat(String(t.lastPrice)),
          change24h: parseFloat(String(rec.priceChange ?? 0)),
          changePercent24h: parseFloat(String(rec.priceChangePercent ?? 0)),
          volume: parseFloat(String(t.volume)),
          high24h: parseFloat(String(t.highPrice)),
          low24h: parseFloat(String(t.lowPrice)),
        });
      }
    }
  }

  return tickers.sort((a, b) => b.volume * b.price - a.volume * a.price);
}
