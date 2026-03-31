"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { useFinanceLive } from "@/lib/swr/hooks";
import { PortfolioSummary } from "./portfolio-summary";
import { BinanceHoldings } from "./binance-holdings";
import { PolkadotWallets } from "./polkadot-wallets";
import type { BinancePortfolio } from "@/lib/modules/finance/binance";
import type { PolkadotPortfolio } from "@/lib/modules/finance/polkadot";

export function LiveView() {
  const t = useT();
  const {
    data: binance,
    error: binanceErr,
    isLoading: binanceLoading,
    isValidating: binanceValidating,
    mutate: mutateBinance,
  } = useFinanceLive("binance");
  const {
    data: polkadot,
    error: polkadotErr,
    isLoading: polkadotLoading,
    isValidating: polkadotValidating,
    mutate: mutatePolkadot,
  } = useFinanceLive("polkadot");

  const binanceData = binance as BinancePortfolio | undefined;
  const polkadotData = polkadot as PolkadotPortfolio | undefined;
  const binanceError = binanceErr ? t("finance.liveView.failedBinance") : undefined;
  const polkadotError = polkadotErr ? t("finance.liveView.failedPolkadot") : undefined;
  const refreshing = binanceValidating || polkadotValidating;
  const loading = binanceLoading && polkadotLoading;

  const handleManualRefresh = () => {
    mutateBinance();
    mutatePolkadot();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
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
        binanceTotal={binanceData?.totalUsd ?? 0}
        polkadotTotal={polkadotData?.totalUsd ?? 0}
        loading={loading}
      />

      <BinanceHoldings
        spot={binanceData?.spot ?? []}
        funding={binanceData?.funding ?? []}
        earn={binanceData?.earn ?? []}
        loading={loading}
        error={binanceError}
      />

      <PolkadotWallets
        wallets={polkadotData?.wallets ?? []}
        dotPrice={polkadotData?.dotPrice ?? 0}
        loading={loading}
        error={polkadotError}
      />
    </div>
  );
}
