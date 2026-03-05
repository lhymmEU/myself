"use client";

import type { TickerInfo } from "@/lib/modules/finance/binance";

interface MarketTickerProps {
  tickers: TickerInfo[];
  loading: boolean;
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function stripUsdt(symbol: string): string {
  return symbol.replace(/USDT$/, "");
}

export function MarketTicker({ tickers, loading }: MarketTickerProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Market Ticker
        </span>
        <span className="text-[10px] text-amber-700">CRYPTO/USD</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-0.5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] text-amber-700 uppercase border-b border-amber-900/20 pb-1 mb-1">
            <span>Symbol</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h %</span>
            <span className="text-right">Vol</span>
          </div>
          {tickers.map((t) => {
            const isUp = t.changePercent24h >= 0;
            return (
              <div
                key={t.symbol}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 py-0.5 hover:bg-amber-950/30 px-1 rounded text-xs"
              >
                <span className="font-bold text-amber-200">
                  {stripUsdt(t.symbol)}
                </span>
                <span className="text-right font-mono text-amber-100">
                  {formatPrice(t.price)}
                </span>
                <span
                  className={`text-right font-mono ${
                    isUp ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {t.changePercent24h.toFixed(2)}%
                </span>
                <span className="text-right font-mono text-amber-600">
                  {formatVolume(t.volume * t.price)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
