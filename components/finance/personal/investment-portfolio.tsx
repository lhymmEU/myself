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
import type { FinanceAccount, FinanceInvestment } from "@/lib/modules/finance/personal-actions";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const INVESTMENTS_KEY = "/api/finance/personal/investments";
const ACCOUNTS_KEY = "/api/finance/personal";

const PIE_COLORS = [
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function InvestmentPortfolio() {
  const t = useT();
  const { data: investments, error: invError, isLoading: invLoading } = useSWR<FinanceInvestment[]>(
    INVESTMENTS_KEY,
    swrFetcher
  );
  const { data: accounts, error: acctError } = useSWR<FinanceAccount[]>(ACCOUNTS_KEY, swrFetcher);

  const accountById = useMemo(() => {
    const m = new Map<string, FinanceAccount>();
    (accounts ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const pieData = useMemo(() => {
    if (!investments?.length) return [];
    return investments.map((inv) => {
      const cost = inv.shares * inv.avg_cost_basis;
      return { name: inv.symbol, value: cost };
    });
  }, [investments]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");

  const selectedCurrency =
    accountId && accountById.get(accountId)?.currency
      ? accountById.get(accountId)!.currency
      : "USD";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const sh = parseFloat(shares);
    const ac = parseFloat(avgCost);
    if (!accountId || !symbol.trim() || Number.isNaN(sh) || sh <= 0 || Number.isNaN(ac) || ac < 0) {
      toast.error(t("finance.personal.investmentAddFailed"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/personal/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          symbol: symbol.trim().toUpperCase(),
          shares: sh,
          avg_cost_basis: ac,
          currency: selectedCurrency,
        }),
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(INVESTMENTS_KEY);
      toast.success(t("finance.personal.investmentAdded"));
      setDialogOpen(false);
      setSymbol("");
      setShares("");
      setAvgCost("");
    } catch {
      toast.error(t("finance.personal.investmentAddFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/finance/personal/investments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(INVESTMENTS_KEY);
      toast.success(t("finance.personal.investmentDeleted"));
    } catch {
      toast.error(t("finance.personal.investmentDeleteFailed"));
    }
  }

  if (invError || acctError) {
    return (
      <div className="text-destructive text-sm">{t("finance.personal.loadFailed")}</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("finance.personal.investmentsTitle")}</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" aria-hidden />
                {t("finance.personal.addInvestment")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("finance.personal.addInvestment")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="grid gap-4 pt-2">
                <div className="grid gap-2">
                  <Label>{t("finance.personal.selectAccount")}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("finance.personal.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-sym">{t("finance.personal.symbol")}</Label>
                  <Input
                    id="inv-sym"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="AAPL"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-sh">{t("finance.personal.shares")}</Label>
                  <Input
                    id="inv-sh"
                    type="number"
                    step="any"
                    min="0"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-ac">{t("finance.personal.avgCost")}</Label>
                  <Input
                    id="inv-ac"
                    type="number"
                    step="0.01"
                    min="0"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={submitting || !accounts?.length}>
                  {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {t("common.add")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {invLoading || !investments ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" aria-hidden />
            </div>
          ) : investments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("finance.personal.noInvestments")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="p-3 font-medium">{t("finance.personal.symbol")}</th>
                    <th className="p-3 font-medium text-right">{t("finance.personal.shares")}</th>
                    <th className="p-3 font-medium text-right">{t("finance.personal.avgCost")}</th>
                    <th className="p-3 font-medium text-right">{t("finance.personal.totalCost")}</th>
                    <th className="p-3 font-medium text-right">{t("finance.personal.currentValue")}</th>
                    <th className="p-3 font-medium text-right">{t("finance.personal.gainLoss")}</th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => {
                    const totalCost = inv.shares * inv.avg_cost_basis;
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{inv.symbol}</td>
                        <td className="p-3 text-right tabular-nums">{inv.shares}</td>
                        <td className="p-3 text-right tabular-nums">
                          {formatMoney(inv.avg_cost_basis, inv.currency)}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {formatMoney(totalCost, inv.currency)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground tabular-nums">
                          {t("finance.personal.placeholderValue")}
                        </td>
                        <td className="p-3 text-right text-muted-foreground tabular-nums">
                          {t("finance.personal.placeholderValue")}
                        </td>
                        <td className="p-3">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label={t("common.delete")}
                            onClick={() => handleDelete(inv.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("finance.personal.allocationBySymbol")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {pieData.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {t("finance.chart.noData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {pieData.map((_, i) => (
                    <Cell key={`inv-cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    const name =
                      item &&
                      typeof item === "object" &&
                      "payload" in item &&
                      item.payload &&
                      typeof item.payload === "object" &&
                      "name" in item.payload
                        ? String((item.payload as { name?: string }).name)
                        : "";
                    const cur =
                      investments?.find((x) => x.symbol === name)?.currency ?? "USD";
                    return formatMoney(n, cur);
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
