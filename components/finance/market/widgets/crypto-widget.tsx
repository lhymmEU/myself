"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "@/components/finance/search-input";
import { PriceChart } from "@/components/finance/price-chart";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useModuleContext } from "@/components/finance/market/module-card";
import { useT } from "@/lib/i18n/context";
import type { CryptoHistorical } from "@/lib/modules/finance/types";

const POPULAR_PAIRS = [
  { symbol: "BTCUSD", label: "Bitcoin" },
  { symbol: "ETHUSD", label: "Ethereum" },
  { symbol: "SOLUSD", label: "Solana" },
  { symbol: "BNBUSD", label: "BNB" },
  { symbol: "XRPUSD", label: "XRP" },
  { symbol: "ADAUSD", label: "Cardano" },
  { symbol: "DOTUSD", label: "Polkadot" },
  { symbol: "AVAXUSD", label: "Avalanche" },
];

export function CryptoWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const [symbol, setSymbol] = useState("BTCUSD");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const { data: priceData, isLoading } = useOpenBB<{
    results: CryptoHistorical[];
  }>(
    connected && symbol ? "crypto/price/historical" : null,
    { symbol, provider: "yfinance" },
  );

  const handleSearch = useCallback((q: string) => {
    if (q) {
      const normalized = q.toUpperCase().replace(/[^A-Z]/g, "");
      setSymbol(normalized.endsWith("USD") ? normalized : `${normalized}USD`);
    }
  }, []);

  const prices = priceData?.results ?? [];
  const currentLabel =
    POPULAR_PAIRS.find((p) => p.symbol === symbol)?.label ?? symbol;
  const lastClose = prices.length > 0 ? prices[prices.length - 1].close : null;

  useEffect(() => {
    if (!updateContext) return;
    updateContext({
      symbol,
      label: currentLabel,
      lastClose,
    });
  }, [updateContext, symbol, currentLabel, lastClose]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_PAIRS.map((pair) => (
            <button
              key={pair.symbol}
              type="button"
              onClick={() => setSymbol(pair.symbol)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                symbol === pair.symbol
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {pair.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-56 shrink-0">
          <SearchInput
            placeholder={t("finance.crypto.searchPlaceholder")}
            onSearch={handleSearch}
          />
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-sm">{currentLabel}</span>
          {lastClose != null && (
            <span className="text-lg tabular-nums">
              $
              {lastClose.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{symbol}</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PriceChart data={prices} height={320} />
        )}
      </div>
    </div>
  );
}
