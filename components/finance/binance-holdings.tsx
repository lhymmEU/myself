"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AssetBalance, EarnPosition } from "@/lib/modules/finance/binance";

interface BinanceHoldingsProps {
  spot: AssetBalance[];
  funding: AssetBalance[];
  earn: EarnPosition[];
  loading: boolean;
  error?: string;
}

const COLORS = [
  "#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

function formatAmount(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(4)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(4)}K`;
  if (v < 0.0001) return v.toExponential(2);
  return v.toFixed(4);
}

function AssetTable({
  assets,
}: {
  assets: { asset: string; amount: number; usdValue: number }[];
}) {
  const t = useT();
  const sorted = [...assets].sort((a, b) => b.usdValue - a.usdValue);
  const total = sorted.reduce((s, a) => s + a.usdValue, 0);

  if (!sorted.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("finance.binance.noAssets")}
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">{t("finance.binance.asset")}</th>
            <th className="pb-2 font-medium text-right">{t("finance.binance.amount")}</th>
            <th className="pb-2 font-medium text-right">{t("finance.polkadot.value")}</th>
            <th className="pb-2 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr
              key={a.asset}
              className="border-b border-border/50 hover:bg-muted/30"
            >
              <td className="py-2 font-medium">{a.asset}</td>
              <td className="py-2 text-right font-mono text-xs">
                {formatAmount(a.amount)}
              </td>
              <td className="py-2 text-right font-mono text-xs">
                {formatUsd(a.usdValue)}
              </td>
              <td className="py-2 text-right font-mono text-xs">
                {total > 0 ? ((a.usdValue / total) * 100).toFixed(1) : "0.0"}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BinanceHoldings({
  spot,
  funding,
  earn,
  loading,
  error,
}: BinanceHoldingsProps) {
  const t = useT();
  const [tab, setTab] = useState("spot");

  const spotAssets = spot.map((s) => ({
    asset: s.asset,
    amount: s.free + s.locked,
    usdValue: s.usdValue,
  }));

  const fundingAssets = funding.map((f) => ({
    asset: f.asset,
    amount: f.free + f.locked,
    usdValue: f.usdValue,
  }));

  const earnAssets = earn.map((e) => ({
    asset: `${e.asset} (${e.type})`,
    amount: e.amount,
    usdValue: e.usdValue,
  }));

  const allAssets = [...spotAssets, ...fundingAssets, ...earnAssets];
  const aggregated: Record<string, number> = {};
  for (const a of allAssets) {
    const key = a.asset.replace(/ \(.*\)$/, "");
    aggregated[key] = (aggregated[key] ?? 0) + a.usdValue;
  }
  const pieData = Object.entries(aggregated)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("finance.binance.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("finance.binance.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("common.loading")}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="spot">
                    {t("finance.binance.spot")} ({spot.length})
                  </TabsTrigger>
                  <TabsTrigger value="funding">
                    {t("finance.binance.funding")} ({funding.length})
                  </TabsTrigger>
                  <TabsTrigger value="earn">
                    {t("finance.binance.earn")} ({earn.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="spot" className="mt-3">
                  <AssetTable assets={spotAssets} />
                </TabsContent>
                <TabsContent value="funding" className="mt-3">
                  <AssetTable assets={fundingAssets} />
                </TabsContent>
                <TabsContent value="earn" className="mt-3">
                  <AssetTable assets={earnAssets} />
                </TabsContent>
              </Tabs>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("finance.binance.allocation")}</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatUsd(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {t("finance.binance.noData")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1 text-xs">
                    <div
                      className="size-2 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
