"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Ticker {
  symbol: string;
  price: number;
  changePercent24h: number;
}

function stripUsdt(s: string) {
  return s.replace(/USDT$/, "");
}

export function FinancePreview() {
  const [tickers, setTickers] = useState<Ticker[]>([]);

  useEffect(() => {
    fetch("/api/finance/market?source=binance")
      .then((r) => r.json())
      .then((data) => {
        if (data.tickers) setTickers(data.tickers.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  if (!tickers.length) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Activity className="size-3" />
        Loading market data...
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {tickers.map((t) => {
        const isUp = t.changePercent24h >= 0;
        return (
          <div key={t.symbol} className="space-y-0.5">
            <div className="flex items-center gap-1">
              {isUp ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className="text-[10px] text-muted-foreground">
                {stripUsdt(t.symbol)}
              </span>
            </div>
            <p className="text-sm font-semibold font-mono">
              $
              {t.price >= 1000
                ? t.price.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })
                : t.price.toFixed(2)}
            </p>
            <p
              className={`text-[10px] font-mono ${
                isUp ? "text-green-500" : "text-red-500"
              }`}
            >
              {isUp ? "+" : ""}
              {t.changePercent24h.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
