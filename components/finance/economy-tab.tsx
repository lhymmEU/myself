"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { PriceChart } from "./price-chart";
import { ConnectionBanner } from "./connection-banner";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";
import type { CurrencyRate } from "@/lib/modules/finance/types";

interface IndicatorConfig {
  id: string;
  labelKey: TranslationKey;
  symbol: string;
  provider: string;
}

const INDICATORS: IndicatorConfig[] = [
  { id: "gdp", labelKey: "finance.economy.gdp", symbol: "GDP", provider: "econdb" },
  { id: "cpi", labelKey: "finance.economy.cpi", symbol: "CPI", provider: "econdb" },
  { id: "unrate", labelKey: "finance.economy.unemployment", symbol: "URATE", provider: "econdb" },
  { id: "fedfunds", labelKey: "finance.economy.fedFunds", symbol: "Y10YD", provider: "econdb" },
];

const CURRENCY_PAIRS = [
  { pair: "EURUSD", label: "EUR/USD" },
  { pair: "GBPUSD", label: "GBP/USD" },
  { pair: "USDJPY", label: "USD/JPY" },
  { pair: "USDCNY", label: "USD/CNY" },
  { pair: "AUDUSD", label: "AUD/USD" },
  { pair: "USDCHF", label: "USD/CHF" },
];

export function EconomyTab() {
  const t = useT();
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorConfig>(
    INDICATORS[0],
  );
  const [selectedPair, setSelectedPair] = useState("EURUSD");

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

  const { data: forexData, isLoading: forexLoading } = useOpenBB<{
    results: CurrencyRate[];
  }>(
    connected ? "currency/price/historical" : null,
    { symbol: selectedPair, provider: "yfinance" },
  );

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const indicatorValues = (indicatorData?.results ?? []).map((d) => ({
    date: d.date,
    close: d.value ?? d.close ?? 0,
  }));

  const forexValues = (forexData?.results ?? []).map((d) => ({
    date: d.date,
    close: d.close,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("finance.economy.indicators")}
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {INDICATORS.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setSelectedIndicator(ind)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedIndicator.id === ind.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {t(ind.labelKey)}
            </button>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t(selectedIndicator.labelKey)} ({selectedIndicator.symbol})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {indicatorLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PriceChart data={indicatorValues} />
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <DollarSign className="size-4" />
          {t("finance.economy.forex")}
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {CURRENCY_PAIRS.map((cp) => (
            <button
              key={cp.pair}
              onClick={() => setSelectedPair(cp.pair)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedPair === cp.pair
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cp.label}
            </button>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {CURRENCY_PAIRS.find((c) => c.pair === selectedPair)?.label ??
                selectedPair}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forexLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PriceChart data={forexValues} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
