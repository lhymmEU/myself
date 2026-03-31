"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Globe, Factory } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "./search-input";
import { PriceChart } from "./price-chart";
import { ConnectionBanner } from "./connection-banner";
import { useT } from "@/lib/i18n/context";
import type {
  EquitySearchResult,
  EquityHistorical,
  EquityProfile,
} from "@/lib/modules/finance/types";

export function EquityTab() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: searchData, isLoading: searching } = useOpenBB<{
    results: EquitySearchResult[];
  }>(
    connected && query ? "equity/search" : null,
    { query, provider: "sec" },
  );

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

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const results = searchData?.results ?? [];
  const prices = priceData?.results ?? [];
  const profile = profileData?.results?.[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <SearchInput
          placeholder={t("finance.equity.searchPlaceholder")}
          onSearch={handleSearch}
        />

        {searching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {results.slice(0, 20).map((r) => (
              <button
                key={`${r.symbol}-${r.exchange}`}
                onClick={() => {
                  setSymbol(r.symbol);
                  setQuery("");
                }}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
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
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("finance.equity.noResults")}
          </p>
        )}

        {!query && !symbol && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("finance.equity.searchHint")}
          </p>
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
        {symbol && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{symbol}</span>
                  {prices.length > 0 && (
                    <span className="text-2xl">
                      $
                      {prices[prices.length - 1].close.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </CardTitle>
                {profile?.name && (
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                )}
              </CardHeader>
              <CardContent>
                {priceLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PriceChart data={prices} />
                )}
              </CardContent>
            </Card>

            {profile && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {t("finance.equity.companyProfile")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {profile.sector && (
                      <div className="flex items-center gap-2">
                        <Factory className="size-3.5 text-muted-foreground" />
                        <span>{profile.sector}</span>
                      </div>
                    )}
                    {profile.industry && (
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span>{profile.industry}</span>
                      </div>
                    )}
                    {profile.country && (
                      <div className="flex items-center gap-2">
                        <Globe className="size-3.5 text-muted-foreground" />
                        <span>{profile.country}</span>
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
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                      {profile.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
