"use client";

import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/modules/finance/types";

const typeColors: Record<string, string> = {
  income: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expense: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  investment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const amountColors: Record<string, string> = {
  income: "text-green-600",
  expense: "text-red-600",
  investment: "text-purple-600",
};

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransactionList({
  transactions,
  onDelete,
}: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}) {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) =>
      sortAsc
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date)
    );
  }, [transactions, sortAsc]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm">Add your first transaction to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th
              className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-foreground"
              onClick={() => setSortAsc((p) => !p)}
            >
              Date {sortAsc ? "↑" : "↓"}
            </th>
            <th className="px-4 py-3 text-left font-medium">Description</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((txn) => (
            <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">{txn.date}</td>
              <td className="px-4 py-3">{txn.description || "—"}</td>
              <td className="px-4 py-3">{txn.category}</td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className={typeColors[txn.type]}>
                  {txn.type}
                </Badge>
              </td>
              <td className={`px-4 py-3 text-right font-medium ${amountColors[txn.type]}`}>
                {txn.type === "expense" ? "-" : "+"}{fmt(txn.amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => onDelete(txn.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
