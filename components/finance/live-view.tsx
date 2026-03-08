"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { PortfolioSummary } from "./portfolio-summary";
import { BinanceHoldings } from "./binance-holdings";
import { PolkadotWallets } from "./polkadot-wallets";
import type { BinancePortfolio } from "@/lib/modules/finance/binance";
import type { PolkadotPortfolio } from "@/lib/modules/finance/polkadot";

const REFRESH_INTERVAL = 60_000;

export function LiveView() {
  const t = useT();
  const [binance, setBinance] = useState<BinancePortfolio | null>(null);
  const [polkadot, setPolkadot] = useState<PolkadotPortfolio | null>(null);
  const [binanceError, setBinanceError] = useState<string>();
  const [polkadotError, setPolkadotError] = useState<string>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const binanceConfigError = useRef(false);
  const polkadotConfigError = useRef(false);

  const fetchData = useCallback(async (isManual = false) => {
    setRefreshing(true);

    const promises: Promise<void>[] = [];

    if (!binanceConfigError.current || isManual) {
      promises.push(
        fetch("/api/finance/live?source=binance")
          .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
              setBinance(data);
              setBinanceError(undefined);
              binanceConfigError.current = false;
            } else {
              setBinanceError(data.error);
              binanceConfigError.current = res.status === 400;
            }
          })
          .catch(() => {
            setBinanceError(t("finance.liveView.failedBinance"));
          })
      );
    }

    if (!polkadotConfigError.current || isManual) {
      promises.push(
        fetch("/api/finance/live?source=polkadot")
          .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
              setPolkadot(data);
              setPolkadotError(undefined);
              polkadotConfigError.current = false;
            } else {
              setPolkadotError(data.error);
              polkadotConfigError.current = res.status === 400;
            }
          })
          .catch(() => {
            setPolkadotError(t("finance.liveView.failedPolkadot"));
          })
      );
    }

    await Promise.allSettled(promises);
    setRefreshing(false);
    setInitialLoading(false);
    setLastUpdated(new Date());
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + polling
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = () => {
    binanceConfigError.current = false;
    polkadotConfigError.current = false;
    fetchData(true);
  };

  const loading = initialLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              {t("finance.liveView.lastUpdated")} {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`size-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          {t("common.refresh")}
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
