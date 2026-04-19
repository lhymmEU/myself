"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "./search-input";
import { PriceChart } from "./price-chart";
import { ConnectionBanner } from "./connection-banner";
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

export function CryptoTab() {
  const t = useT();
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

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const prices = priceData?.results ?? [];
  const currentLabel =
    POPULAR_PAIRS.find((p) => p.symbol === symbol)?.label ?? symbol;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-wrap gap-2">
          {POPULAR_PAIRS.map((pair) => (
            <button
              key={pair.symbol}
              onClick={() => {
                setSymbol(pair.symbol);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                symbol === pair.symbol
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {pair.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <SearchInput
            placeholder={t("finance.crypto.searchPlaceholder")}
            onSearch={handleSearch}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{currentLabel}</span>
            {prices.length > 0 && (
              <span className="text-2xl">
                $
                {prices[prices.length - 1].close.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{symbol}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PriceChart data={prices} height={400} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
