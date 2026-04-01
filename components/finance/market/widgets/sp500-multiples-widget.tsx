"use client";

import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { ConnectionBanner } from "@/components/finance/connection-banner";

const PREFERRED_KEYS = [
  "pe_ratio",
  "pe",
  "forward_pe",
  "earnings_yield",
  "dividend_yield",
  "pb_ratio",
  "ps_ratio",
  "peg_ratio",
  "date",
];

export function Sp500MultiplesWidget() {
  const setContext = useModuleContext();

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data, isLoading, error } = useOpenBB<{
    results?: Array<Record<string, unknown>>;
  }>(connected ? "index/sp500_multiples" : null, { provider: "multpl" });

  const row = data?.results?.[0];

  const entries = useMemo(() => {
    if (!row) return [];
    const keys = Object.keys(row).filter((k) => k !== "provider");
    const ordered = [
      ...PREFERRED_KEYS.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !PREFERRED_KEYS.includes(k)),
    ];
    return ordered.map((k) => [k, row[k]] as const);
  }, [row]);

  useEffect(() => {
    setContext?.({ module: "sp500Multiples", snapshot: row ?? null });
  }, [setContext, row]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !row) {
    return (
      <p className="text-xs text-muted-foreground">
        {error ? "Could not load S&P 500 multiples." : "No multiples data returned."}
      </p>
    );
  }

  function fmt(v: unknown): string {
    if (v == null) return "—";
    if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    if (typeof v === "string") return v;
    return String(v);
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {entries.slice(0, 12).map(([k, v]) => (
        <div
          key={k}
          className="rounded-md border border-border bg-muted/30 px-2 py-1.5 space-y-0.5"
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {k.replace(/_/g, " ")}
          </div>
          <div className="font-medium tabular-nums">{fmt(v)}</div>
        </div>
      ))}
    </div>
  );
}
