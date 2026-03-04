"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/modules/finance/types";

const PIE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#9333ea",
  "#16a34a",
  "#ea580c",
  "#0891b2",
  "#d946ef",
  "#ca8a04",
  "#4f46e5",
  "#e11d48",
  "#059669",
  "#7c3aed",
];

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function Charts({ transactions }: { transactions: Transaction[] }) {
  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const txn of transactions) {
      const key = getMonthKey(txn.date);
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      if (txn.type === "income") entry.income += txn.amount;
      else if (txn.type === "expense") entry.expenses += txn.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: getMonthLabel(key),
        Income: Math.round(val.income * 100) / 100,
        Expenses: Math.round(val.expenses * 100) / 100,
      }));
  }, [transactions]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const txn of transactions) {
      if (txn.type !== "expense") continue;
      map.set(txn.category, (map.get(txn.category) ?? 0) + txn.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No data to chart</p>
        <p className="text-sm">Add some transactions to see charts</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value) =>
                  "$" + Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                }
              />
              <Legend />
              <Bar dataKey="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              No expense data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    "$" + Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
