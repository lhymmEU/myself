"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PolymarketEvent,
  PolymarketMarket,
} from "@/lib/modules/finance/polymarket";

interface EventsPanelProps {
  onSelectMarket?: (market: PolymarketMarket) => void;
}

const TAGS = [
  { value: "", label: "All" },
  { value: "politics", label: "Politics" },
  { value: "crypto", label: "Crypto" },
  { value: "sports", label: "Sports" },
  { value: "pop-culture", label: "Pop Culture" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
];

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function EventsPanel({ onSelectMarket }: EventsPanelProps) {
  const [tag, setTag] = useState("");
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "events", limit: "15" });
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/finance/market?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Events
        </span>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="text-[10px] bg-transparent border border-amber-900/40 rounded px-1.5 py-0.5 text-amber-300 outline-none"
        >
          {TAGS.map((t) => (
            <option key={t.value} value={t.value} className="bg-[#0a0a0f]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          Loading...
        </div>
      ) : events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          No events found
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="border border-amber-900/20 rounded p-2"
            >
              <p className="text-xs text-amber-200 font-medium mb-1.5 line-clamp-2">
                {evt.title}
              </p>
              {evt.markets.length > 0 ? (
                <div className="space-y-1">
                  {evt.markets.slice(0, 3).map((m) => {
                    const yesPrice = m.outcomePrices[0] ?? 0;
                    const pct = Math.round(yesPrice * 100);
                    return (
                      <div
                        key={m.id}
                        onClick={() => onSelectMarket?.(m)}
                        className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-amber-950/40 cursor-pointer"
                      >
                        <span className="text-[10px] text-amber-400 truncate flex-1">
                          {m.question}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-green-400">
                            {pct}¢
                          </span>
                          <span className="text-[10px] text-amber-700">
                            {formatVolume(m.volume)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {evt.markets.length > 3 && (
                    <p className="text-[10px] text-amber-700 pl-1.5">
                      +{evt.markets.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-amber-700">No markets</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
