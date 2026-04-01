"use client";

import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useT } from "@/lib/i18n/context";
import type { TreasuryRate } from "@/lib/modules/finance/types";

const TENOR_BOXES: { label: string; key: keyof TreasuryRate }[] = [
  { label: "1M", key: "month_1" },
  { label: "3M", key: "month_3" },
  { label: "6M", key: "month_6" },
  { label: "1Y", key: "year_1" },
  { label: "2Y", key: "year_2" },
  { label: "5Y", key: "year_5" },
  { label: "10Y", key: "year_10" },
  { label: "30Y", key: "year_30" },
];

export function TreasuryRatesWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: ratesRaw, isLoading } = useOpenBB<{ results: TreasuryRate[] }>(
    connected ? "fixedincome/government/treasury_rates" : null,
    { provider: "federal_reserve" },
  );

  const rates = ratesRaw?.results ?? [];
  const latestRate = rates.length ? rates[rates.length - 1] : null;

  const contextRates = useMemo(() => {
    if (!latestRate) return null;
    const out: Record<string, number | undefined> = {};
    for (const { label, key } of TENOR_BOXES) {
      const v = latestRate[key];
      out[label] = typeof v === "number" ? v : undefined;
    }
    return out;
  }, [latestRate]);

  useEffect(() => {
    if (updateContext && contextRates) {
      updateContext({ treasuryRates: contextRates, asOf: latestRate?.date });
    }
  }, [updateContext, contextRates, latestRate?.date]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!latestRate) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("finance.modules.widget.noTreasuryData")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {TENOR_BOXES.map(({ label, key }) => {
        const value = latestRate[key];
        return (
          <div key={label} className="rounded-md border p-2 text-center">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-semibold mt-0.5">
              {typeof value === "number" ? `${value.toFixed(2)}%` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
