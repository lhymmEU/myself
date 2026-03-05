"use client";

import type { PolymarketMarket } from "@/lib/modules/finance/polymarket";

interface PolymarketFeedProps {
  markets: PolymarketMarket[];
  loading: boolean;
  onSelect?: (market: PolymarketMarket) => void;
  selectedId?: string;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function PriceBar({ price, label }: { price: number; label: string }) {
  const pct = Math.round(price * 100);
  const isYes = label.toLowerCase() === "yes";
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="w-6 text-amber-500">{label}</span>
      <div className="flex-1 h-3 bg-amber-950/40 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm ${
            isYes ? "bg-green-500/70" : "bg-red-500/70"
          }`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-amber-200">
        {pct}¢
      </span>
    </div>
  );
}

export function PolymarketFeed({
  markets,
  loading,
  onSelect,
  selectedId,
}: PolymarketFeedProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Top Markets
        </span>
        <span className="text-[10px] text-amber-700">
          {markets.length} ACTIVE
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          Loading...
        </div>
      ) : markets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          No markets available
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-1.5">
          {markets.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelect?.(m)}
              className={`border rounded p-2 cursor-pointer transition-colors ${
                selectedId === m.id
                  ? "border-amber-500/60 bg-amber-950/50"
                  : "border-amber-900/20 hover:bg-amber-950/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs text-amber-100 leading-tight line-clamp-2">
                  {m.question}
                </p>
                <span className="text-[10px] text-amber-600 shrink-0">
                  {formatVolume(m.volume)}
                </span>
              </div>
              <div className="space-y-0.5">
                {m.outcomes.map((outcome, i) => (
                  <PriceBar
                    key={outcome}
                    label={outcome}
                    price={m.outcomePrices[i] ?? 0}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
