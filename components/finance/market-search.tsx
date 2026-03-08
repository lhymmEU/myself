"use client";

import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { PolymarketMarket } from "@/lib/modules/finance/polymarket";

interface MarketSearchProps {
  onSelect?: (market: PolymarketMarket) => void;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function MarketSearch({ onSelect }: MarketSearchProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/finance/market?action=search&q=${encodeURIComponent(q)}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.markets ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 600);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          {t("finance.marketSearch.title")}
        </span>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-amber-700" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={t("finance.marketSearch.placeholder")}
          className="w-full bg-amber-950/30 border border-amber-900/40 rounded pl-7 pr-2 py-1.5 text-xs text-amber-100 placeholder:text-amber-800 outline-none focus:border-amber-700"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          {t("finance.marketSearch.searching")}
        </div>
      ) : !searched ? (
        <div className="flex-1 flex items-center justify-center text-amber-800 text-[10px]">
          {t("finance.marketSearch.typeToSearch")}
        </div>
      ) : results.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          {t("finance.marketSearch.noResults")} &quot;{query}&quot;
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-1">
          {results.map((m) => {
            const yesPrice = m.outcomePrices[0] ?? 0;
            const pct = Math.round(yesPrice * 100);
            return (
              <div
                key={m.id}
                onClick={() => onSelect?.(m)}
                className="border border-amber-900/20 rounded p-2 hover:bg-amber-950/30 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-amber-100 leading-tight line-clamp-2">
                    {m.question}
                  </p>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-mono text-green-400 block">
                      {pct}¢
                    </span>
                    <span className="text-[10px] text-amber-700">
                      {formatVolume(m.volume)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
