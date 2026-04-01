"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { swrFetcher } from "@/lib/swr/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { FinanceBudget, FinanceTransaction } from "@/lib/modules/finance/personal-actions";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

const BUDGETS_KEY = "/api/finance/personal/budgets";

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY"];

function monthRangeStrings(d: Date) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { from, to, year, month };
}

function buildExpenseTxUrl(from: string, to: string) {
  const sp = new URLSearchParams();
  sp.set("type", "expense");
  sp.set("from_date", from);
  sp.set("to_date", to);
  return `/api/finance/personal/transactions?${sp.toString()}`;
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function BudgetView() {
  const t = useT();
  const { from, to, year, month } = useMemo(() => monthRangeStrings(new Date()), []);
  const expenseUrl = useMemo(() => buildExpenseTxUrl(from, to), [from, to]);

  const { data: budgets, error: budgetError, isLoading: budgetsLoading } = useSWR<FinanceBudget[]>(
    BUDGETS_KEY,
    swrFetcher
  );
  const { data: expenses, error: txError, isLoading: txLoading } = useSWR<FinanceTransaction[]>(
    expenseUrl,
    swrFetcher
  );

  const spentByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const tx of expenses ?? []) {
      if (tx.type !== "expense") continue;
      const c = tx.category.toLowerCase();
      m.set(c, (m.get(c) ?? 0) + tx.amount);
    }
    return m;
  }, [expenses]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [currency, setCurrency] = useState("USD");

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    const limit = parseFloat(monthlyLimit);
    if (!category.trim() || Number.isNaN(limit) || limit <= 0) {
      toast.error(t("finance.personal.budgetAddFailed"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/personal/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.trim(),
          monthly_limit: limit,
          currency,
        }),
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(BUDGETS_KEY);
      toast.success(t("finance.personal.budgetAdded"));
      setDialogOpen(false);
      setCategory("");
      setMonthlyLimit("");
      setCurrency("USD");
    } catch {
      toast.error(t("finance.personal.budgetAddFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (budgetError || txError) {
    return (
      <div className="text-destructive text-sm">{t("finance.personal.loadFailed")}</div>
    );
  }

  const loading = budgetsLoading || txLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{t("finance.personal.budgetTitle")}</CardTitle>
          <p className="text-muted-foreground text-xs mt-1">
            {year}-{String(month).padStart(2, "0")}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" aria-hidden />
              {t("finance.personal.addBudget")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("finance.personal.addBudget")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBudget} className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label htmlFor="bud-cat">{t("finance.personal.budgetCategory")}</Label>
                <Input
                  id="bud-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="food"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bud-limit">{t("finance.personal.monthlyLimit")}</Label>
                <Input
                  id="bud-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("finance.personal.currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("finance.personal.selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {t("common.add")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading || !budgets ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" aria-hidden />
          </div>
        ) : budgets.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("finance.personal.noBudgets")}</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {budgets.map((b) => {
              const spentRaw = spentByCategory.get(b.category.toLowerCase()) ?? 0;
              const limit = b.monthly_limit;
              const ratio = limit > 0 ? spentRaw / limit : 0;
              const pct = Math.min(100, ratio * 100);
              const barColor =
                ratio < 0.75
                  ? "bg-emerald-500"
                  : ratio <= 0.9
                    ? "bg-amber-500"
                    : "bg-rose-500";
              return (
                <li key={b.id} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium capitalize">{b.category}</span>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {t("finance.personal.spentLabel")}: {formatMoney(spentRaw, b.currency)} /{" "}
                      {t("finance.personal.limitLabel")}: {formatMoney(limit, b.currency)}
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={cn("h-full rounded-full transition-all", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
