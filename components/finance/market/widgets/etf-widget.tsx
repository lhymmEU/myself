"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { SearchInput } from "@/components/finance/search-input";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type EtfSearchRow = { symbol?: string; name?: string };
type EtfInfoRow = {
  name?: string;
  description?: string;
  asset_class?: string;
  [key: string]: unknown;
};
type HoldingRow = {
  name?: string;
  symbol?: string;
  weight?: number;
  [key: string]: unknown;
};

export function EtfWidget() {
  const setContext = useModuleContext();
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: searchData, isLoading: searching } = useOpenBB<{
    results?: EtfSearchRow[];
  }>(connected && query ? "etf/search" : null, {
    query,
    provider: "fmp",
  });

  const { data: infoData, isLoading: infoLoading } = useOpenBB<{
    results?: EtfInfoRow[];
  }>(connected && symbol ? "etf/info" : null, {
    symbol: symbol ?? "",
    provider: "fmp",
  });

  const { data: holdingsData, isLoading: holdingsLoading } = useOpenBB<{
    results?: HoldingRow[];
  }>(connected && symbol ? "etf/holdings" : null, {
    symbol: symbol ?? "",
    provider: "fmp",
  });

  const handleSearch = useCallback((q: string) => setQuery(q), []);

  const info = infoData?.results?.[0];
  const holdings = useMemo(
    () => holdingsData?.results ?? [],
    [holdingsData?.results],
  );
  const searchResults = searchData?.results ?? [];

  useEffect(() => {
    setContext?.({
      module: "etf",
      symbol,
      query,
      info,
      topHoldings: holdings.slice(0, 15),
    });
  }, [setContext, symbol, query, info, holdings]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3 text-sm">
      <SearchInput placeholder="Search ETF symbol or name…" onSearch={handleSearch} />

      {searching && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!searching && query && searchResults.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border p-1">
          {searchResults.slice(0, 25).map((r, i) => (
            <button
              key={`${r.symbol}-${i}`}
              type="button"
              onClick={() => {
                if (r.symbol) setSymbol(r.symbol);
                setQuery("");
              }}
              className={`w-full rounded px-2 py-1.5 text-left hover:bg-accent ${
                symbol === r.symbol ? "bg-accent" : ""
              }`}
            >
              <span className="font-medium">{r.symbol}</span>
              {r.name && (
                <span className="text-muted-foreground ml-2 truncate">{r.name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {symbol && (
        <div className="space-y-3 border-t border-border pt-3">
          {infoLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : info ? (
            <div className="space-y-2">
              <div className="font-medium">{info.name ?? symbol}</div>
              {info.asset_class && (
                <div className="text-muted-foreground text-xs">
                  Asset class: {String(info.asset_class)}
                </div>
              )}
              {info.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                  {String(info.description)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No ETF info returned.</p>
          )}

          <div>
            <div className="text-xs font-medium mb-1">Top holdings</div>
            {holdingsLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : holdings.length > 0 ? (
              <ul className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {holdings.slice(0, 20).map((h, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {h.name ?? h.symbol ?? "—"}
                      {h.symbol && h.name ? (
                        <span className="text-muted-foreground ml-1">({h.symbol})</span>
                      ) : null}
                    </span>
                    {h.weight != null && (
                      <span className="shrink-0 tabular-nums">
                        {typeof h.weight === "number"
                          ? `${h.weight.toFixed(2)}%`
                          : String(h.weight)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No holdings data.</p>
            )}
          </div>
        </div>
      )}

      {!symbol && !query && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Search to pick an ETF, then view profile and holdings.
        </p>
      )}
    </div>
  );
}
