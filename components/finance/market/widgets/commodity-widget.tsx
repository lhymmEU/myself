"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { PriceChart } from "@/components/finance/price-chart";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import type { CryptoHistorical } from "@/lib/modules/finance/types";

const PAIRS = [
  { symbol: "GCUSD", label: "Gold" },
  { symbol: "SIUSD", label: "Silver" },
  { symbol: "CLUSD", label: "Crude oil" },
  { symbol: "NGUSD", label: "Natural gas" },
] as const;

export function CommodityWidget() {
  const setContext = useModuleContext();
  const [symbol, setSymbol] = useState<string>("GCUSD");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: priceData, isLoading } = useOpenBB<{
    results?: CryptoHistorical[];
  }>(connected && symbol ? "crypto/price/historical" : null, {
    symbol,
    provider: "yfinance",
  });

  const prices = useMemo(
    () => priceData?.results ?? [],
    [priceData?.results],
  );
  const label = PAIRS.find((p) => p.symbol === symbol)?.label ?? symbol;

  useEffect(() => {
    setContext?.({
      module: "commodity",
      symbol,
      label,
      lastClose: prices.length ? prices[prices.length - 1]?.close : undefined,
    });
  }, [setContext, symbol, label, prices]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {PAIRS.map((p) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => setSymbol(p.symbol)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              symbol === p.symbol
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        {prices.length > 0 && (
          <span className="text-lg tabular-nums">
            $
            {prices[prices.length - 1].close.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground font-mono">{symbol}</p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PriceChart data={prices} height={220} />
      )}
    </div>
  );
}
