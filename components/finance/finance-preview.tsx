"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface PreviewMarket {
  question: string;
  outcomePrices: number[];
  volume: number;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function FinancePreview() {
  const t = useT();
  const [markets, setMarkets] = useState<PreviewMarket[]>([]);

  useEffect(() => {
    fetch("/api/finance/market?action=list&limit=3")
      .then((r) => r.json())
      .then((data) => {
        if (data.markets) setMarkets(data.markets.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  if (!markets.length) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Activity className="size-3" />
        {t("finance.preview.loadingMarkets")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {markets.map((m, i) => {
        const pct = Math.round((m.outcomePrices[0] ?? 0) * 100);
        return (
          <div key={i} className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {m.question}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-semibold text-green-500">
                {pct}¢
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatVolume(m.volume)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
