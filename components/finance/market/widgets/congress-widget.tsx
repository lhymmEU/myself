"use client";

import { useEffect, useMemo } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type BillRow = Record<string, unknown>;

function rowsOf(data: unknown): BillRow[] {
  if (!data || typeof data !== "object") return [];
  const r = (data as { results?: unknown }).results;
  return Array.isArray(r) ? r.filter((x): x is BillRow => x != null && typeof x === "object") : [];
}

function billTitle(row: BillRow): string {
  const t = row.title ?? row.short_title ?? row.bill_title ?? row.name;
  return typeof t === "string" && t ? t : "Untitled bill";
}

function billDate(row: BillRow): string {
  const d =
    row.update_date ??
    row.last_action_date ??
    row.introduced_date ??
    row.date ??
    row.updated_at;
  return typeof d === "string" ? d : d != null ? String(d) : "—";
}

function billStatus(row: BillRow): string {
  const s =
    row.latest_action ??
    row.status ??
    row.state ??
    row.last_action ??
    row.bill_type;
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && "text" in s && typeof (s as { text: unknown }).text === "string") {
    return (s as { text: string }).text;
  }
  return "—";
}

function billUrl(row: BillRow): string | null {
  const u = row.url ?? row.congress_gov_url ?? row.link ?? row.uri;
  return typeof u === "string" && u.startsWith("http") ? u : null;
}

export function CongressWidget() {
  const setContext = useModuleContext();

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data, isLoading, error } = useOpenBB<unknown>(
    connected ? "uscongress/bills" : null,
    {},
  );

  const bills = useMemo(() => rowsOf(data), [data]);

  useEffect(() => {
    setContext?.({
      module: "congress",
      billCount: bills.length,
      recent: bills.slice(0, 5).map((b) => billTitle(b)),
    });
  }, [setContext, bills]);

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

  if (error) {
    return (
      <p className="text-xs text-destructive">
        Could not load bills (check GovInfo / OpenBB provider config).
      </p>
    );
  }

  if (!bills.length) {
    return <p className="text-xs text-muted-foreground">No bills returned.</p>;
  }

  return (
    <ul className="max-h-64 overflow-y-auto space-y-3 text-xs">
      {bills.slice(0, 25).map((row, i) => {
        const href = billUrl(row);
        return (
          <li key={i} className="border-b border-border/50 pb-2 last:border-0">
            <div className="font-medium leading-snug">{billTitle(row)}</div>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
              <span>{billDate(row)}</span>
              <span className="line-clamp-2">{billStatus(row)}</span>
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary mt-1 hover:underline"
              >
                More info
                <ExternalLink className="size-3" />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
