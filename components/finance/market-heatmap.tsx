"use client";

import type { TickerInfo } from "@/lib/modules/finance/binance";

interface MarketHeatmapProps {
  tickers: TickerInfo[];
  loading: boolean;
}

function stripUsdt(symbol: string): string {
  return symbol.replace(/USDT$/, "");
}

function getHeatColor(pct: number): string {
  if (pct >= 5) return "bg-green-500 text-green-950";
  if (pct >= 2) return "bg-green-600 text-green-100";
  if (pct >= 0.5) return "bg-green-800 text-green-200";
  if (pct >= -0.5) return "bg-amber-900/60 text-amber-300";
  if (pct >= -2) return "bg-red-800 text-red-200";
  if (pct >= -5) return "bg-red-600 text-red-100";
  return "bg-red-500 text-red-950";
}

export function MarketHeatmap({ tickers, loading }: MarketHeatmapProps) {
  const sorted = [...tickers].sort(
    (a, b) => b.volume * b.price - a.volume * a.price
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-[10px] text-amber-700">24H CHANGE</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          Loading...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-4 gap-1 auto-rows-min">
          {sorted.map((t) => {
            const isUp = t.changePercent24h >= 0;
            return (
              <div
                key={t.symbol}
                className={`rounded p-2 flex flex-col items-center justify-center ${getHeatColor(
                  t.changePercent24h
                )}`}
              >
                <span className="text-xs font-bold">
                  {stripUsdt(t.symbol)}
                </span>
                <span className="text-[10px] font-mono">
                  {isUp ? "+" : ""}
                  {t.changePercent24h.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
