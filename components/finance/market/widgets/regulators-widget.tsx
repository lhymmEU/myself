"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { SearchInput } from "@/components/finance/search-input";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type InstitutionRow = Record<string, unknown>;

function rowsOf(data: unknown): InstitutionRow[] {
  if (!data || typeof data !== "object") return [];
  const r = (data as { results?: unknown }).results;
  return Array.isArray(r) ? r.filter((x): x is InstitutionRow => x != null && typeof x === "object") : [];
}

function labelRow(row: InstitutionRow): string {
  const name = row.name ?? row.title ?? row.company_name;
  const cik = row.cik ?? row.cik_str;
  if (typeof name === "string" && name) {
    return cik != null ? `${name} (CIK ${cik})` : name;
  }
  return JSON.stringify(row).slice(0, 120);
}

export function RegulatorsWidget() {
  const setContext = useModuleContext();
  const [query, setQuery] = useState("");
  const isCik = /^\d{1,10}$/.test(query.trim());

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: searchData, isLoading: searchLoading } = useOpenBB<unknown>(
    connected && query && !isCik ? "regulators/sec/institutions_search" : null,
    { query, provider: "sec" },
  );

  const { data: cikData, isLoading: cikLoading } = useOpenBB<unknown>(
    connected && query && isCik ? "regulators/sec/cik_map" : null,
    { cik: query.trim(), provider: "sec" },
  );

  const handleSearch = useCallback((q: string) => setQuery(q), []);

  const listRows = useMemo(() => {
    if (isCik) return rowsOf(cikData);
    return rowsOf(searchData);
  }, [isCik, cikData, searchData]);

  const loading = isCik ? cikLoading : searchLoading;

  useEffect(() => {
    setContext?.({
      module: "regulators",
      query,
      mode: isCik ? "cik_map" : "institutions_search",
      resultCount: listRows.length,
    });
  }, [setContext, query, isCik, listRows.length]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3 text-sm">
      <SearchInput
        placeholder="Company name or numeric CIK…"
        onSearch={handleSearch}
      />

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && query && (
        <p className="text-[11px] text-muted-foreground">
          {isCik ? "CIK lookup" : "Institution search"}
        </p>
      )}

      {!loading && query && listRows.length > 0 && (
        <ul className="max-h-52 overflow-y-auto space-y-1 text-xs rounded-md border border-border p-2">
          {listRows.slice(0, 40).map((row, i) => (
            <li key={i} className="leading-snug border-b border-border/40 pb-1 last:border-0">
              {labelRow(row)}
            </li>
          ))}
        </ul>
      )}

      {!loading && query && listRows.length === 0 && (
        <p className="text-xs text-muted-foreground">No results.</p>
      )}

      {!query && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Search SEC institutions or enter a CIK.
        </p>
      )}
    </div>
  );
}
