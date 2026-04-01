"use client";

import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type Row = Record<string, unknown>;

function rowsOf(data: unknown): Row[] {
  if (!data || typeof data !== "object") return [];
  const r = (data as { results?: unknown }).results;
  return Array.isArray(r) ? r.filter((x): x is Row => x != null && typeof x === "object") : [];
}

function TableBlock({ title, rows }: { title: string; rows: Row[] }) {
  if (!rows.length) {
    return (
      <div>
        <div className="text-xs font-medium mb-1">{title}</div>
        <p className="text-xs text-muted-foreground">No data.</p>
      </div>
    );
  }
  const keys = Object.keys(rows[0]).filter((k) => k !== "provider");
  return (
    <div>
      <div className="text-xs font-medium mb-1">{title}</div>
      <div className="overflow-x-auto max-h-40 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-muted/80">
            <tr>
              {keys.map((k) => (
                <th key={k} className="text-left p-1 font-medium capitalize">
                  {k.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((row, i) => (
              <tr key={i} className="border-t border-border/60">
                {keys.map((k) => (
                  <td key={k} className="p-1 align-top">
                    {formatCell(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return JSON.stringify(v).slice(0, 80);
}

export function FixedIncomeWidget() {
  const setContext = useModuleContext();

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: bondData, isLoading: bondLoading } = useOpenBB<unknown>(
    connected ? "fixedincome/bond_indices" : null,
    {},
  );

  const { data: mortgageData, isLoading: mortgageLoading } = useOpenBB<unknown>(
    connected ? "fixedincome/mortgage_indices" : null,
    {},
  );

  const bondRows = useMemo(() => rowsOf(bondData), [bondData]);
  const mortgageRows = useMemo(() => rowsOf(mortgageData), [mortgageData]);

  useEffect(() => {
    setContext?.({
      module: "fixedIncome",
      bondIndicesCount: bondRows.length,
      mortgageIndicesCount: mortgageRows.length,
    });
  }, [setContext, bondRows.length, mortgageRows.length]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const loading = bondLoading || mortgageLoading;

  return (
    <div className="space-y-4 text-sm">
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <>
          <TableBlock title="Bond indices" rows={bondRows} />
          <TableBlock title="Mortgage indices" rows={mortgageRows} />
        </>
      )}
    </div>
  );
}
