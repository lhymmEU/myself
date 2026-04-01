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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import {
  Loader2,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { TranslationKey } from "@/lib/i18n/types";
import type { FinanceAccount } from "@/lib/modules/finance/personal-actions";

const ACCOUNT_TYPE_KEYS: Record<FinanceAccount["type"], TranslationKey> = {
  checking: "finance.personal.accountTypes.checking",
  savings: "finance.personal.accountTypes.savings",
  credit: "finance.personal.accountTypes.credit",
  investment: "finance.personal.accountTypes.investment",
  cash: "finance.personal.accountTypes.cash",
};

const SUMMARY_KEY = "/api/finance/personal?summary=true";

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

const ACCOUNT_TYPES: FinanceAccount["type"][] = [
  "checking",
  "savings",
  "credit",
  "investment",
  "cash",
];

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY"];

/** Placeholder monthly cash flow for the area chart until historical series exists */
const CASH_FLOW_PLACEHOLDER = [
  { month: "M-5", flow: 1200 },
  { month: "M-4", flow: 1450 },
  { month: "M-3", flow: 980 },
  { month: "M-2", flow: 1620 },
  { month: "M-1", flow: 1390 },
  { month: "M", flow: 1510 },
];

export interface FinanceSummaryResponse {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  categoryBreakdown: { category: string; total: number }[];
  accounts: FinanceAccount[];
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PersonalDashboard() {
  const t = useT();
  const { data, error, isLoading } = useSWR<FinanceSummaryResponse>(
    SUMMARY_KEY,
    swrFetcher
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<FinanceAccount["type"]>("checking");
  const [currency, setCurrency] = useState("USD");
  const [balance, setBalance] = useState("0");

  const savingsRate = useMemo(() => {
    if (!data) return null;
    const { monthlyIncome, monthlyExpense } = data;
    if (monthlyIncome <= 0) return null;
    return ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.categoryBreakdown?.length) return [];
    return data.categoryBreakdown.map((row) => ({
      name: row.category,
      value: row.total,
    }));
  }, [data]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bal = parseFloat(balance);
      if (Number.isNaN(bal)) {
        toast.error(t("finance.personal.accountAddFailed"));
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/finance/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Account",
          type,
          currency,
          balance: bal,
          color: "#6366f1",
          icon: "wallet",
        }),
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(SUMMARY_KEY);
      toast.success(t("finance.personal.accountAdded"));
      setDialogOpen(false);
      setName("");
      setBalance("0");
      setType("checking");
      setCurrency("USD");
    } catch {
      toast.error(t("finance.personal.accountAddFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">{t("finance.personal.loadFailed")}</div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("finance.personal.netWorth")}
            </CardTitle>
            <Wallet className="text-muted-foreground size-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(data.netWorth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("finance.personal.monthlyIncome")}
            </CardTitle>
            <TrendingUp className="size-4 text-emerald-500" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(data.monthlyIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("finance.personal.monthlyExpenses")}
            </CardTitle>
            <TrendingDown className="size-4 text-rose-500" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatMoney(data.monthlyExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("finance.personal.savingsRate")}
            </CardTitle>
            <Percent className="text-muted-foreground size-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {savingsRate == null
                ? t("finance.personal.savingsRateNA")
                : `${savingsRate.toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("finance.personal.cashFlowTitle")}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {t("finance.personal.cashFlowHint")}
            </p>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CASH_FLOW_PLACEHOLDER} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={56}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="flow"
                  stroke="#6366f1"
                  fill="url(#cashFlowGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("finance.personal.expenseByCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
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
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatMoney(
                        typeof value === "number" ? value : Number(value ?? 0)
                      )
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="size-5" aria-hidden />
            {t("finance.personal.accounts")}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" aria-hidden />
                {t("finance.personal.addAccount")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("finance.personal.addAccount")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAccount} className="grid gap-4 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="acct-name">{t("finance.personal.accountName")}</Label>
                  <Input
                    id="acct-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("common.name")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("finance.personal.accountType")}</Label>
                  <Select value={type} onValueChange={(v) => setType(v as FinanceAccount["type"])}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((at) => (
                        <SelectItem key={at} value={at}>
                          {t(ACCOUNT_TYPE_KEYS[at])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="grid gap-2">
                  <Label htmlFor="acct-balance">{t("finance.personal.initialBalance")}</Label>
                  <Input
                    id="acct-balance"
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t("finance.personal.createAccount")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {data.accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("finance.personal.noAccounts")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.accounts.map((acct) => (
                <li
                  key={acct.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{acct.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {t(ACCOUNT_TYPE_KEYS[acct.type])}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatMoney(acct.balance, acct.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
