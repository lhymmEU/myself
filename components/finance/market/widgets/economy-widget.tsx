"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { PriceChart } from "@/components/finance/price-chart";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useModuleContext } from "@/components/finance/market/module-card";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

interface IndicatorConfig {
  id: string;
  labelKey: TranslationKey;
  symbol: string;
}

const INDICATORS: IndicatorConfig[] = [
  { id: "gdp", labelKey: "finance.economy.gdp", symbol: "GDP" },
  { id: "cpi", labelKey: "finance.economy.cpi", symbol: "CPI" },
  {
    id: "unrate",
    labelKey: "finance.economy.unemployment",
    symbol: "URATE",
  },
  {
    id: "fedfunds",
    labelKey: "finance.economy.fedFunds",
    symbol: "Y10YD",
  },
];

export function EconomyWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorConfig>(
    INDICATORS[0],
  );

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: indicatorData, isLoading: indicatorLoading } = useOpenBB<{
    results: Array<{ date: string; value?: number; close?: number }>;
  }>(
    connected ? "economy/indicators" : null,
    {
      symbol: selectedIndicator.symbol,
      provider: "econdb",
      country: "united_states",
    },
  );

  const indicatorValues = (indicatorData?.results ?? []).map((d) => ({
    date: d.date,
    close: d.value ?? d.close ?? 0,
  }));

  const latestPoint =
    indicatorValues.length > 0
      ? indicatorValues[indicatorValues.length - 1]
      : null;

  const indicatorLabel = t(selectedIndicator.labelKey);

  useEffect(() => {
    if (!updateContext) return;
    updateContext({
      indicatorId: selectedIndicator.id,
      indicatorSymbol: selectedIndicator.symbol,
      indicatorLabel,
      latestValue: latestPoint?.close,
      latestDate: latestPoint?.date,
    });
  }, [
    updateContext,
    selectedIndicator.id,
    selectedIndicator.symbol,
    indicatorLabel,
    latestPoint?.close,
    latestPoint?.date,
  ]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("finance.modules.widget.economyIndicatorsHint")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {INDICATORS.map((ind) => (
          <button
            key={ind.id}
            type="button"
            onClick={() => setSelectedIndicator(ind)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedIndicator.id === ind.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t(ind.labelKey)}
          </button>
        ))}
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium mb-2">
          {t(selectedIndicator.labelKey)} ({selectedIndicator.symbol})
        </div>
        {indicatorLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PriceChart data={indicatorValues} height={260} />
        )}
      </div>
    </div>
  );
}
