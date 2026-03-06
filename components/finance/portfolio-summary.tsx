"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Wallet, Coins } from "lucide-react";

interface PortfolioSummaryProps {
  binanceTotal: number;
  polkadotTotal: number;
  loading: boolean;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PortfolioSummary({
  binanceTotal,
  polkadotTotal,
  loading,
}: PortfolioSummaryProps) {
  const total = binanceTotal + polkadotTotal;
  const binancePct = total > 0 ? (binanceTotal / total) * 100 : 0;
  const polkadotPct = total > 0 ? (polkadotTotal / total) * 100 : 0;

  const cards = [
    {
      label: "Total Portfolio",
      value: formatUsd(total),
      icon: DollarSign,
      accent: "text-emerald-500",
    },
    {
      label: "Binance",
      value: formatUsd(binanceTotal),
      icon: Coins,
      accent: "text-yellow-500",
      pct: binancePct,
    },
    {
      label: "Polkadot",
      value: formatUsd(polkadotTotal),
      icon: Wallet,
      accent: "text-pink-500",
      pct: polkadotPct,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : c.value}
                </p>
                {c.pct !== undefined && !loading && (
                  <p className="text-xs text-muted-foreground">
                    {c.pct.toFixed(1)}% of portfolio
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full bg-muted ${c.accent}`}>
                <c.icon className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
