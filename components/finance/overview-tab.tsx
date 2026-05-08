"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { ConnectionBanner } from "./connection-banner";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { MarketIndex, TreasuryRate } from "@/lib/modules/finance/types";

export function OverviewTab() {
  const t = useT();

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: indicesRaw, isLoading: indicesLoading } = useOpenBB<{
    results: MarketIndex[];
  }>(
    connected ? "index/snapshots" : null,
    { provider: "cboe", region: "us" },
  );

  const { data: ratesRaw, isLoading: ratesLoading } = useOpenBB<{
    results: TreasuryRate[];
  }>(
    connected ? "fixedincome/government/treasury_rates" : null,
    { provider: "federal_reserve" },
  );

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const indices = indicesRaw?.results ?? [];
  const rates = ratesRaw?.results ?? [];
  const latestRate = rates.length ? rates[rates.length - 1] : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="size-4" />
          {t("finance.overview.marketIndices")}
        </h3>
        {indicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : indices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {indices.slice(0, 10).map((idx) => {
              const positive = (idx.change_percent ?? 0) >= 0;
              return (
                <Card key={idx.symbol}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-xs text-muted-foreground truncate">
                      {idx.name ?? idx.symbol}
                    </div>
                    <div className="text-lg font-semibold mt-1">
                      {idx.price?.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      }) ?? "—"}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs mt-1 ${
                        positive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {positive ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {idx.change_percent != null
                        ? `${positive ? "+" : ""}${idx.change_percent.toFixed(2)}%`
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("finance.overview.noIndices")}
          </p>
        )}
      </div>

      {latestRate && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="size-4" />
            {t("finance.overview.treasuryRates")}
          </h3>
          {ratesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: "1M", value: latestRate.month_1 },
                { label: "3M", value: latestRate.month_3 },
                { label: "6M", value: latestRate.month_6 },
                { label: "1Y", value: latestRate.year_1 },
                { label: "2Y", value: latestRate.year_2 },
                { label: "5Y", value: latestRate.year_5 },
                { label: "10Y", value: latestRate.year_10 },
                { label: "30Y", value: latestRate.year_30 },
              ].map((r) => (
                <Card key={r.label}>
                  <CardContent className="pt-3 pb-2 px-3 text-center">
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {r.value != null ? `${r.value.toFixed(2)}%` : "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
