"use client";

import { useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useT } from "@/lib/i18n/context";
import type { MarketIndex } from "@/lib/modules/finance/types";

export function MarketIndicesWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;
  const { data: indicesRaw, isLoading } = useOpenBB<{ results: MarketIndex[] }>(
    connected ? "index/snapshots" : null,
    { provider: "tmx" },
  );
  const indices = indicesRaw?.results ?? [];

  useEffect(() => {
    if (updateContext && indices.length > 0) {
      updateContext({
        indices: indices.slice(0, 5).map((i) => ({
          name: i.name,
          price: i.price,
          change: i.change_percent,
        })),
      });
    }
  }, [updateContext, indices]);

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

  if (indices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("finance.modules.widget.noIndices")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {indices.slice(0, 10).map((idx) => {
        const positive = (idx.change_percent ?? 0) >= 0;
        return (
          <div key={idx.symbol} className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground truncate">
              {idx.name ?? idx.symbol}
            </div>
            <div className="text-sm font-semibold mt-0.5">
              {idx.price?.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }) ?? "—"}
            </div>
            <div
              className={`flex items-center gap-1 text-xs mt-0.5 ${
                positive ? "text-green-600" : "text-red-500"
              }`}
            >
              {positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {idx.change_percent != null
                ? `${positive ? "+" : ""}${idx.change_percent.toFixed(2)}%`
                : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
