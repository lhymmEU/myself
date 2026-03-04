"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Budget, Transaction, BudgetPeriod } from "@/lib/modules/finance/types";

function getProgressColor(pct: number) {
  if (pct >= 100) return "bg-red-600";
  if (pct >= 75) return "bg-orange-500";
  return "bg-green-600";
}

export function BudgetTracker({
  budgets,
  transactions,
  onSetBudget,
  onDeleteBudget,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  onSetBudget: (category: string, amount: number, period?: BudgetPeriod) => void;
  onDeleteBudget: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");

  const spentByCategory = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const txn of transactions) {
      if (txn.type !== "expense") continue;
      const txnDate = new Date(txn.date);
      if (
        txnDate.getMonth() === now.getMonth() &&
        txnDate.getFullYear() === now.getFullYear()
      ) {
        map.set(txn.category, (map.get(txn.category) ?? 0) + txn.amount);
      }
    }
    return map;
  }, [transactions]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!category || !parsedAmount) return;
    onSetBudget(category, parsedAmount, period);
    setCategory("");
    setAmount("");
    setPeriod("monthly");
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Budget Overview</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-category">Category</Label>
                <Input
                  id="budget-category"
                  placeholder="e.g. Food, Transport"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Amount</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-period">Period</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Save Budget
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No budgets set</p>
          <p className="text-sm">Create a budget to start tracking spending</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const spent = spentByCategory.get(b.category) ?? 0;
            const pct = Math.min((spent / b.amount) * 100, 100);
            return (
              <Card key={b.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{b.category}</p>
                      <p className="text-sm text-muted-foreground">
                        ${spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / $
                        {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="ml-1 text-xs">({b.period})</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          pct >= 100
                            ? "text-red-600"
                            : pct >= 75
                              ? "text-orange-500"
                              : "text-green-600"
                        }`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => onDeleteBudget(b.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
