"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/finance/connection-banner";

function flattenSummary(raw: Record<string, unknown>): [string, unknown][] {
  const preferred = [
    "mean",
    "median",
    "std",
    "std_dev",
    "variance",
    "skew",
    "skewness",
    "kurtosis",
    "min",
    "max",
    "count",
    "n",
  ];
  const keys = Object.keys(raw).filter((k) => k !== "provider");
  const ordered = [
    ...preferred.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferred.includes(k)),
  ];
  return ordered.map((k) => [k, raw[k]] as const);
}

export function QuantitativeWidget() {
  const setContext = useModuleContext();
  const [input, setInput] = useState("AAPL");
  const [symbol, setSymbol] = useState("AAPL");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data, isLoading, error } = useOpenBB<{
    results?: Array<Record<string, unknown>>;
  }>(connected && symbol ? "quantitative/summary" : null, {
    symbol,
    provider: "yfinance",
  });

  const row = data?.results?.[0];
  const entries = useMemo(() => (row ? flattenSummary(row) : []), [row]);

  useEffect(() => {
    setContext?.({ module: "quantitative", symbol, summary: row ?? null });
  }, [setContext, symbol, row]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3 text-sm">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const s = input.trim().toUpperCase();
          if (s) setSymbol(s);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Symbol"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="secondary">
          Load
        </Button>
      </form>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">Could not load quantitative summary.</p>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="overflow-x-auto max-h-52 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} className="border-t border-border/60 first:border-t-0">
                  <td className="p-1.5 text-muted-foreground capitalize w-1/3">
                    {k.replace(/_/g, " ")}
                  </td>
                  <td className="p-1.5 font-mono tabular-nums">
                    {v == null
                      ? "—"
                      : typeof v === "number"
                        ? v.toLocaleString(undefined, { maximumFractionDigits: 6 })
                        : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && symbol && entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No summary statistics returned.</p>
      )}
    </div>
  );
}
