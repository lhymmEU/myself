"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Building2, Globe, Factory } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "@/components/finance/search-input";
import { PriceChart } from "@/components/finance/price-chart";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useModuleContext } from "@/components/finance/market/module-card";
import { useT } from "@/lib/i18n/context";
import type {
  EquitySearchResult,
  EquityHistorical,
  EquityProfile,
} from "@/lib/modules/finance/types";

export function EquityWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: searchData, isLoading: searching } = useOpenBB<{
    results: EquitySearchResult[];
  }>(connected && query ? "equity/search" : null, { query, provider: "sec" });

  const { data: priceData, isLoading: priceLoading } = useOpenBB<{
    results: EquityHistorical[];
  }>(
    connected && symbol ? "equity/price/historical" : null,
    { symbol: symbol ?? "", provider: "yfinance" },
  );

  const { data: profileData } = useOpenBB<{
    results: EquityProfile[];
  }>(
    connected && symbol ? "equity/profile" : null,
    { symbol: symbol ?? "", provider: "yfinance" },
  );

  const handleSearch = useCallback((q: string) => setQuery(q), []);

  const results = searchData?.results ?? [];
  const prices = priceData?.results ?? [];
  const profile = profileData?.results?.[0];
  const lastClose = prices.length > 0 ? prices[prices.length - 1].close : null;

  useEffect(() => {
    if (!updateContext || !symbol) return;
    updateContext({
      symbol,
      name: profile?.name,
      lastClose,
      sector: profile?.sector,
      industry: profile?.industry,
    });
  }, [updateContext, symbol, profile?.name, profile?.sector, profile?.industry, lastClose]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-3">
        <SearchInput
          placeholder={t("finance.equity.searchPlaceholder")}
          onSearch={handleSearch}
        />

        {searching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {results.slice(0, 20).map((r) => (
              <button
                key={`${r.symbol}-${r.exchange}`}
                type="button"
                onClick={() => {
                  setSymbol(r.symbol);
                  setQuery("");
                }}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  symbol === r.symbol ? "bg-accent" : ""
                }`}
              >
                <span className="font-medium">{r.symbol}</span>
                <span className="text-muted-foreground ml-2 truncate">
                  {r.name}
                </span>
                {r.exchange_short_name && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({r.exchange_short_name})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">
            {t("finance.equity.noResults")}
          </p>
        )}

        {!query && !symbol && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("finance.modules.widget.equitySearchHint")}
          </p>
        )}
      </div>

      <div className="lg:col-span-2 space-y-3">
        {symbol && (
          <>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold">{symbol}</span>
                {lastClose != null && (
                  <span className="text-xl tabular-nums">
                    $
                    {lastClose.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>
              {profile?.name && (
                <p className="text-xs text-muted-foreground mb-2">{profile.name}</p>
              )}
              {priceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PriceChart data={prices} height={280} />
              )}
            </div>

            {profile && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-sm font-medium">
                  {t("finance.equity.companyProfile")}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {profile.sector && (
                    <div className="flex items-center gap-2">
                      <Factory className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{profile.sector}</span>
                    </div>
                  )}
                  {profile.industry && (
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{profile.industry}</span>
                    </div>
                  )}
                  {profile.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{profile.country}</span>
                    </div>
                  )}
                </div>
                {profile.market_cap != null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {t("finance.equity.marketCap")}:{" "}
                    </span>
                    <span className="font-medium">
                      $
                      {profile.market_cap >= 1e12
                        ? `${(profile.market_cap / 1e12).toFixed(2)}T`
                        : profile.market_cap >= 1e9
                          ? `${(profile.market_cap / 1e9).toFixed(2)}B`
                          : `${(profile.market_cap / 1e6).toFixed(2)}M`}
                    </span>
                  </div>
                )}
                {profile.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {profile.description}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
