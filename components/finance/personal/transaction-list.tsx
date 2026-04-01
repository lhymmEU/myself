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
import type { TranslationKey } from "@/lib/i18n/types";
import type { FinanceAccount, FinanceTransaction } from "@/lib/modules/finance/personal-actions";
import { Loader2, Plus, Trash2 } from "lucide-react";

const ACCOUNTS_KEY = "/api/finance/personal";

const SUGGESTED_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "health",
  "education",
  "shopping",
  "salary",
  "freelance",
  "investment",
  "other",
] as const;

const TX_TYPES: FinanceTransaction["type"][] = ["income", "expense", "transfer"];

const TYPE_KEYS: Record<FinanceTransaction["type"], TranslationKey> = {
  income: "finance.personal.typeIncome",
  expense: "finance.personal.typeExpense",
  transfer: "finance.personal.typeTransfer",
};

function buildTransactionsUrl(params: {
  typeFilter: string;
  fromDate: string;
  toDate: string;
  accountId: string;
}) {
  const sp = new URLSearchParams();
  if (params.typeFilter && params.typeFilter !== "all") {
    sp.set("type", params.typeFilter);
  }
  if (params.fromDate) sp.set("from_date", params.fromDate);
  if (params.toDate) sp.set("to_date", params.toDate);
  if (params.accountId && params.accountId !== "all") {
    sp.set("account_id", params.accountId);
  }
  const q = sp.toString();
  return q ? `/api/finance/personal/transactions?${q}` : "/api/finance/personal/transactions";
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TransactionList() {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const txUrl = useMemo(
    () => buildTransactionsUrl({ typeFilter, fromDate, toDate, accountId: accountFilter }),
    [typeFilter, fromDate, toDate, accountFilter]
  );

  const { data: accounts, error: accountsError } = useSWR<FinanceAccount[]>(
    ACCOUNTS_KEY,
    swrFetcher
  );
  const { data: transactions, error: txError, isLoading } = useSWR<FinanceTransaction[]>(
    txUrl,
    swrFetcher
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAccountId, setNewAccountId] = useState("");
  const [newType, setNewType] = useState<FinanceTransaction["type"]>("expense");
  const [newCategory, setNewCategory] = useState("other");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDescription, setNewDescription] = useState("");

  const accountById = useMemo(() => {
    const m = new Map<string, FinanceAccount>();
    (accounts ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const selectedAccountCurrency =
    newAccountId && accountById.get(newAccountId)?.currency
      ? accountById.get(newAccountId)!.currency
      : "USD";

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountId) {
      toast.error(t("finance.personal.transactionAddFailed"));
      return;
    }
    const amount = parseFloat(newAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(t("finance.personal.transactionAddFailed"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/personal/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: newAccountId,
          type: newType,
          category: newCategory.trim() || t("finance.personal.categoryOther"),
          amount,
          currency: selectedAccountCurrency,
          date: newDate,
          description: newDescription.trim(),
          recurring: 0,
          recurring_interval: null,
        }),
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(txUrl);
      await mutate(ACCOUNTS_KEY);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/finance/personal/transactions"));
      await mutate("/api/finance/personal?summary=true");
      toast.success(t("finance.personal.transactionAdded"));
      setDialogOpen(false);
      setNewAmount("");
      setNewDescription("");
      setNewCategory("other");
    } catch {
      toast.error(t("finance.personal.transactionAddFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/finance/personal/transactions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("bad status");
      await mutate(txUrl);
      await mutate(ACCOUNTS_KEY);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/finance/personal/transactions"));
      await mutate("/api/finance/personal?summary=true");
      toast.success(t("finance.personal.transactionDeleted"));
    } catch {
      toast.error(t("finance.personal.transactionDeleteFailed"));
    }
  }

  if (accountsError || txError) {
    return (
      <div className="text-destructive text-sm">{t("finance.personal.loadFailed")}</div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("finance.personal.transactionsTitle")}</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" aria-hidden />
              {t("finance.personal.addTransaction")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("finance.personal.addTransaction")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label>{t("finance.personal.selectAccount")}</Label>
                <Select value={newAccountId} onValueChange={setNewAccountId}>
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
                <Label>{t("finance.personal.filterType")}</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as FinanceTransaction["type"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(TYPE_KEYS[tp])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("finance.personal.selectCategory")}</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUGGESTED_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-amt">{t("finance.personal.tableAmount")}</Label>
                <Input
                  id="tx-amt"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-date">{t("finance.personal.tableDate")}</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-desc">{t("common.description")}</Label>
                <Input
                  id="tx-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
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
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">{t("finance.personal.filterType")}</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("finance.personal.typeAll")}</SelectItem>
                <SelectItem value="income">{t("finance.personal.typeIncome")}</SelectItem>
                <SelectItem value="expense">{t("finance.personal.typeExpense")}</SelectItem>
                <SelectItem value="transfer">{t("finance.personal.typeTransfer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">{t("finance.personal.fromDate")}</Label>
            <Input
              type="date"
              className="w-[160px]"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">{t("finance.personal.toDate")}</Label>
            <Input
              type="date"
              className="w-[160px]"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">{t("finance.personal.filterAccount")}</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("finance.personal.allAccounts")}</SelectItem>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading || !transactions ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" aria-hidden />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("finance.personal.noTransactions")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="p-3 font-medium">{t("finance.personal.tableDate")}</th>
                  <th className="p-3 font-medium">{t("finance.personal.tableDescription")}</th>
                  <th className="p-3 font-medium">{t("finance.personal.tableCategory")}</th>
                  <th className="p-3 font-medium text-right">{t("finance.personal.tableAmount")}</th>
                  <th className="p-3 font-medium">{t("finance.personal.tableAccount")}</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const acct = accountById.get(tx.account_id);
                  const isIncome = tx.type === "income";
                  const isExpense = tx.type === "expense";
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="p-3 whitespace-nowrap tabular-nums text-muted-foreground">
                        {tx.date}
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{tx.description || "—"}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize">
                          {tx.category}
                        </Badge>
                      </td>
                      <td
                        className={`p-3 text-right font-medium tabular-nums ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : ""
                        }`}
                      >
                        {isIncome ? "+" : isExpense ? "−" : ""}
                        {formatMoney(tx.amount, tx.currency)}
                      </td>
                      <td className="p-3">{acct?.name ?? tx.account_id}</td>
                      <td className="p-3">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label={t("common.delete")}
                          onClick={() => handleDelete(tx.id)}
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
  );
}
