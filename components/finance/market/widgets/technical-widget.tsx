"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { useModuleContext } from "@/components/finance/market/module-card";
import { PriceChart } from "@/components/finance/price-chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectionBanner } from "@/components/finance/connection-banner";

type Indicator = "SMA" | "EMA" | "RSI" | "MACD";

const ENDPOINTS: Record<Indicator, string> = {
  SMA: "technical/sma",
  EMA: "technical/ema",
  RSI: "technical/rsi",
  MACD: "technical/macd",
};

function technicalToChartData(
  results: Array<Record<string, unknown>>,
  indicator: Indicator,
): { date: string; close: number }[] {
  return results
    .map((row) => {
      const date = String(row.date ?? row.timestamp ?? "");
      if (!date) return null;
      const close =
        (typeof row.sma === "number" ? row.sma : undefined) ??
        (typeof row.ema === "number" ? row.ema : undefined) ??
        (typeof row.rsi === "number" ? row.rsi : undefined) ??
        (typeof row.macd === "number" ? row.macd : undefined) ??
        (typeof row.macd_histogram === "number" ? row.macd_histogram : undefined) ??
        (typeof row.value === "number" ? row.value : undefined) ??
        (typeof row.close === "number" ? row.close : undefined);
      if (close === undefined) return null;
      return { date, close };
    })
    .filter((x): x is { date: string; close: number } => x != null);
}

export function TechnicalWidget() {
  const setContext = useModuleContext();
  const [input, setInput] = useState("AAPL");
  const [symbol, setSymbol] = useState("AAPL");
  const [indicator, setIndicator] = useState<Indicator>("SMA");
  const [windowLen, setWindowLen] = useState("20");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const endpoint = ENDPOINTS[indicator];
  const needsWindow = indicator === "SMA" || indicator === "EMA";

  const params = useMemo(() => {
    const base: Record<string, string> = {
      symbol,
      provider: "yfinance",
    };
    if (needsWindow) base.window = windowLen;
    return base;
  }, [symbol, needsWindow, windowLen]);

  const { data, isLoading, error } = useOpenBB<{ results?: Array<Record<string, unknown>> }>(
    connected && symbol ? endpoint : null,
    params,
  );

  const chartData = useMemo(
    () => technicalToChartData(data?.results ?? [], indicator),
    [data?.results, indicator],
  );

  useEffect(() => {
    setContext?.({
      module: "technical",
      symbol,
      indicator,
      window: needsWindow ? windowLen : undefined,
      points: chartData.length,
    });
  }, [setContext, symbol, indicator, windowLen, needsWindow, chartData.length]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3 text-sm">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const s = input.trim().toUpperCase();
          if (s) setSymbol(s);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Symbol"
          className="h-8 text-sm max-w-[120px]"
        />
        <Select
          value={indicator}
          onValueChange={(v) => setIndicator(v as Indicator)}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SMA">SMA</SelectItem>
            <SelectItem value="EMA">EMA</SelectItem>
            <SelectItem value="RSI">RSI</SelectItem>
            <SelectItem value="MACD">MACD</SelectItem>
          </SelectContent>
        </Select>
        {needsWindow && (
          <Input
            value={windowLen}
            onChange={(e) => setWindowLen(e.target.value.replace(/\D/g, "") || "1")}
            className="h-8 text-sm w-16"
            title="Window"
          />
        )}
        <Button type="submit" size="sm" variant="secondary">
          Apply
        </Button>
      </form>

      {error && (
        <p className="text-xs text-destructive">
          This indicator may be unavailable for this symbol or provider.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PriceChart data={chartData} height={220} />
      )}
    </div>
  );
}
