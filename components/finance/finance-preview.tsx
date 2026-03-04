"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}

export function FinancePreview() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/data?module=finance&action=summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Start tracking your finances
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          <span className="text-[10px] text-muted-foreground">Income</span>
        </div>
        <p className="text-sm font-semibold">
          ${summary.totalIncome.toLocaleString()}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-red-500" />
          <span className="text-[10px] text-muted-foreground">Expenses</span>
        </div>
        <p className="text-sm font-semibold">
          ${summary.totalExpenses.toLocaleString()}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Wallet className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] text-muted-foreground">Savings</span>
        </div>
        <p className="text-sm font-semibold">
          {summary.savingsRate.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
