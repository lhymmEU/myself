"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type ChainRow = Record<string, unknown>;

function pickNum(row: ChainRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v.toFixed(2);
    if (typeof v === "string" && v.trim()) return v;
  }
  return "—";
}

function flattenChain(raw: unknown): ChainRow[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { results?: unknown };
  const results = obj.results;
  if (!Array.isArray(results)) return [];
  const first = results[0];
  if (first && typeof first === "object" && Array.isArray((first as { chain?: unknown }).chain)) {
    return (first as { chain: ChainRow[] }).chain;
  }
  return results.filter((r): r is ChainRow => r != null && typeof r === "object");
}

export function DerivativesWidget() {
  const setContext = useModuleContext();
  const [input, setInput] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: chainData, isLoading, error } = useOpenBB<unknown>(
    connected && symbol ? "derivatives/options/chains" : null,
    { symbol: symbol ?? "", provider: "tradier" },
  );

  const rows = flattenChain(chainData);

  useEffect(() => {
    setContext?.({
      module: "derivatives",
      symbol,
      chainRowsSample: rows.slice(0, 10),
    });
  }, [setContext, symbol, rows]);

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
          placeholder="Underlying (e.g. AAPL)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="secondary">
          Load
        </Button>
      </form>

      {error && (
        <p className="text-xs text-destructive">
          Could not load chain (check Tradier key in OpenBB).
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && symbol && rows.length > 0 && (
        <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-md border border-border text-xs">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="text-left">
                <th className="p-1.5 font-medium">Strike</th>
                <th className="p-1.5 font-medium">Call bid</th>
                <th className="p-1.5 font-medium">Call ask</th>
                <th className="p-1.5 font-medium">Put bid</th>
                <th className="p-1.5 font-medium">Put ask</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 80).map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="p-1.5 tabular-nums">
                    {pickNum(row, ["strike", "strike_price", "strikePrice"])}
                  </td>
                  <td className="p-1.5 tabular-nums">
                    {pickNum(row, ["call_bid", "callBid", "c_bid"])}
                  </td>
                  <td className="p-1.5 tabular-nums">
                    {pickNum(row, ["call_ask", "callAsk", "c_ask"])}
                  </td>
                  <td className="p-1.5 tabular-nums">
                    {pickNum(row, ["put_bid", "putBid", "p_bid"])}
                  </td>
                  <td className="p-1.5 tabular-nums">
                    {pickNum(row, ["put_ask", "putAsk", "p_ask"])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && symbol && !error && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">No chain rows in response.</p>
      )}
    </div>
  );
}
