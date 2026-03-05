"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolymarketFeed } from "./polymarket-feed";
import { EventsPanel } from "./events-panel";
import { MarketSearch } from "./market-search";
import { MarketDetail } from "./market-detail";
import type { PolymarketMarket } from "@/lib/modules/finance/polymarket";

const REFRESH_INTERVAL = 60_000;

export function PlanView() {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/finance/market?action=list&limit=20");
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.markets ?? []);
      }
    } catch {
      // silently fail
    }
    setRefreshing(false);
    setInitialLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const loading = initialLoading;

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between bg-amber-950/80 border border-amber-900/40 rounded-t-lg px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-mono font-bold text-sm tracking-widest">
            POLYMARKET TERMINAL
          </span>
          <span className="text-amber-700 font-mono text-[10px]">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
          </span>
          {refreshing && (
            <RefreshCw className="size-3 text-amber-700 animate-spin" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
          className="text-amber-500 hover:text-amber-300 hover:bg-amber-900/30 h-6 px-2"
        >
          <RefreshCw className={`size-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-mono">REFRESH</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-t-0 border-amber-900/40 rounded-b-lg overflow-hidden bg-[#0a0a0f] font-mono">
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-amber-900/30 min-h-[340px] max-h-[500px]">
          <PolymarketFeed
            markets={markets}
            loading={loading}
            onSelect={setSelectedMarket}
            selectedId={selectedMarket?.id}
          />
        </div>
        <div className="p-4 border-b lg:border-b-0 border-amber-900/30 min-h-[340px] max-h-[500px]">
          <MarketDetail market={selectedMarket} />
        </div>
        <div className="p-4 border-t lg:border-r border-amber-900/30 min-h-[300px] max-h-[460px]">
          <EventsPanel onSelectMarket={setSelectedMarket} />
        </div>
        <div className="p-4 border-t border-amber-900/30 min-h-[300px] max-h-[460px]">
          <MarketSearch onSelect={setSelectedMarket} />
        </div>
      </div>
    </div>
  );
}
