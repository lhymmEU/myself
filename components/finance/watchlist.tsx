"use client";

import type { TickerInfo } from "@/lib/modules/finance/binance";

interface WatchlistProps {
  tickers: TickerInfo[];
  loading: boolean;
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function stripUsdt(symbol: string): string {
  return symbol.replace(/USDT$/, "");
}

export function Watchlist({ tickers, loading }: WatchlistProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Watchlist
        </span>
        <span className="text-[10px] text-amber-700">24H STATS</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-amber-700 uppercase border-b border-amber-900/20">
                <th className="text-left pb-1 font-medium">Pair</th>
                <th className="text-right pb-1 font-medium">Last</th>
                <th className="text-right pb-1 font-medium">Chg%</th>
                <th className="text-right pb-1 font-medium">High</th>
                <th className="text-right pb-1 font-medium">Low</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map((t) => {
                const isUp = t.changePercent24h >= 0;
                return (
                  <tr
                    key={t.symbol}
                    className="border-b border-amber-900/10 hover:bg-amber-950/30"
                  >
                    <td className="py-1 font-bold text-amber-200">
                      {stripUsdt(t.symbol)}/USDT
                    </td>
                    <td className="py-1 text-right font-mono text-amber-100">
                      {formatPrice(t.price)}
                    </td>
                    <td
                      className={`py-1 text-right font-mono ${
                        isUp ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {t.changePercent24h.toFixed(2)}%
                    </td>
                    <td className="py-1 text-right font-mono text-amber-500">
                      {formatPrice(t.high24h)}
                    </td>
                    <td className="py-1 text-right font-mono text-amber-500">
                      {formatPrice(t.low24h)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
