"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { PriceChart } from "@/components/finance/price-chart";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useModuleContext } from "@/components/finance/market/module-card";
import { useT } from "@/lib/i18n/context";
import type { CurrencyRate } from "@/lib/modules/finance/types";

const CURRENCY_PAIRS = [
  { pair: "EURUSD", label: "EUR/USD" },
  { pair: "GBPUSD", label: "GBP/USD" },
  { pair: "USDJPY", label: "USD/JPY" },
  { pair: "USDCNY", label: "USD/CNY" },
  { pair: "AUDUSD", label: "AUD/USD" },
  { pair: "USDCHF", label: "USD/CHF" },
];

export function ForexWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const [selectedPair, setSelectedPair] = useState("EURUSD");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: forexData, isLoading: forexLoading } = useOpenBB<{
    results: CurrencyRate[];
  }>(
    connected ? "currency/price/historical" : null,
    { symbol: selectedPair, provider: "yfinance" },
  );

  const forexValues = (forexData?.results ?? []).map((d) => ({
    date: d.date,
    close: d.close,
  }));

  const pairLabel =
    CURRENCY_PAIRS.find((c) => c.pair === selectedPair)?.label ?? selectedPair;
  const lastClose =
    forexValues.length > 0 ? forexValues[forexValues.length - 1].close : null;

  useEffect(() => {
    if (!updateContext) return;
    updateContext({
      pair: selectedPair,
      label: pairLabel,
      lastClose,
    });
  }, [updateContext, selectedPair, pairLabel, lastClose]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("finance.modules.widget.forexHint")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CURRENCY_PAIRS.map((cp) => (
          <button
            key={cp.pair}
            type="button"
            onClick={() => setSelectedPair(cp.pair)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedPair === cp.pair
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cp.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium mb-2">{pairLabel}</div>
        {forexLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PriceChart data={forexValues} height={260} />
        )}
      </div>
    </div>
  );
}
