"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioSummary } from "./portfolio-summary";
import { BinanceHoldings } from "./binance-holdings";
import { PolkadotWallets } from "./polkadot-wallets";
import type { BinancePortfolio } from "@/lib/modules/finance/binance";
import type { PolkadotPortfolio } from "@/lib/modules/finance/polkadot";

const REFRESH_INTERVAL = 30_000;

export function LiveView() {
  const [binance, setBinance] = useState<BinancePortfolio | null>(null);
  const [polkadot, setPolkadot] = useState<PolkadotPortfolio | null>(null);
  const [binanceError, setBinanceError] = useState<string>();
  const [polkadotError, setPolkadotError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bRes, pRes] = await Promise.allSettled([
      fetch("/api/finance/live?source=binance"),
      fetch("/api/finance/live?source=polkadot"),
    ]);

    if (bRes.status === "fulfilled") {
      const data = await bRes.value.json();
      if (bRes.value.ok) {
        setBinance(data);
        setBinanceError(undefined);
      } else {
        setBinanceError(data.error);
      }
    }

    if (pRes.status === "fulfilled") {
      const data = await pRes.value.json();
      if (pRes.value.ok) {
        setPolkadot(data);
        setPolkadotError(undefined);
      } else {
        setPolkadotError(data.error);
      }
    }

    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <PortfolioSummary
        binanceTotal={binance?.totalUsd ?? 0}
        polkadotTotal={polkadot?.totalUsd ?? 0}
        loading={loading}
      />

      <BinanceHoldings
        spot={binance?.spot ?? []}
        funding={binance?.funding ?? []}
        earn={binance?.earn ?? []}
        loading={loading}
        error={binanceError}
      />

      <PolkadotWallets
        wallets={polkadot?.wallets ?? []}
        dotPrice={polkadot?.dotPrice ?? 0}
        loading={loading}
        error={polkadotError}
      />
    </div>
  );
}
