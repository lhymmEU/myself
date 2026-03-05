"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketTicker } from "./market-ticker";
import { PolymarketFeed } from "./polymarket-feed";
import { Watchlist } from "./watchlist";
import { MarketHeatmap } from "./market-heatmap";
import type { TickerInfo } from "@/lib/modules/finance/binance";
import type { PolymarketEvent } from "@/lib/modules/finance/polymarket";

const REFRESH_INTERVAL = 15_000;

export function PlanView() {
  const [tickers, setTickers] = useState<TickerInfo[]>([]);
  const [markets, setMarkets] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tickerRes, marketRes] = await Promise.allSettled([
      fetch("/api/finance/market?source=binance"),
      fetch("/api/finance/market?source=polymarket"),
    ]);

    if (tickerRes.status === "fulfilled" && tickerRes.value.ok) {
      const data = await tickerRes.value.json();
      setTickers(data.tickers ?? []);
    }

    if (marketRes.status === "fulfilled" && marketRes.value.ok) {
      const data = await marketRes.value.json();
      setMarkets(data.markets ?? []);
    }

    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const topTickers = tickers.slice(0, 10);
  const allTickers = tickers;

  return (
    <div className="space-y-0">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between bg-amber-950/80 border border-amber-900/40 rounded-t-lg px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-mono font-bold text-sm tracking-widest">
            MARKET TERMINAL
          </span>
          <span className="text-amber-700 font-mono text-[10px]">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="text-amber-500 hover:text-amber-300 hover:bg-amber-900/30 h-6 px-2"
        >
          <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-mono">REFRESH</span>
        </Button>
      </div>

      {/* Terminal grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-t-0 border-amber-900/40 rounded-b-lg overflow-hidden bg-[#0a0a0f] font-mono">
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-amber-900/30 min-h-[320px]">
          <MarketTicker tickers={topTickers} loading={loading} />
        </div>
        <div className="p-4 border-b lg:border-b-0 border-amber-900/30 min-h-[320px]">
          <PolymarketFeed markets={markets} loading={loading} />
        </div>
        <div className="p-4 border-t lg:border-r border-amber-900/30 min-h-[280px]">
          <Watchlist tickers={allTickers} loading={loading} />
        </div>
        <div className="p-4 border-t border-amber-900/30 min-h-[280px]">
          <MarketHeatmap tickers={allTickers} loading={loading} />
        </div>
      </div>
    </div>
  );
}
