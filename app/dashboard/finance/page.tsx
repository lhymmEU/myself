"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards } from "@/components/finance/summary-cards";
import { TransactionList } from "@/components/finance/transaction-list";
import { AddTransaction } from "@/components/finance/add-transaction";
import { Charts } from "@/components/finance/charts";
import { BudgetTracker } from "@/components/finance/budget-tracker";
import type {
  Transaction,
  Budget,
  FinancialSummary,
  CreateTransactionInput,
  BudgetPeriod,
} from "@/lib/modules/finance/types";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    savingsRate: 0,
    netWorth: 0,
  });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [txnRes, sumRes, budRes] = await Promise.all([
        fetch("/api/finance?action=transactions"),
        fetch("/api/finance?action=summary"),
        fetch("/api/finance?action=budgets"),
      ]);
      const [txns, sum, buds] = await Promise.all([
        txnRes.json(),
        sumRes.json(),
        budRes.json(),
      ]);
      setTransactions(txns);
      setSummary(sum);
      setBudgets(buds);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleAdd(input: CreateTransactionInput) {
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) fetchAll();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/finance?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAll();
  }

  async function handleSetBudget(category: string, amount: number, period?: BudgetPeriod) {
    const res = await fetch("/api/finance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setBudget", category, amount, period }),
    });
    if (res.ok) fetchAll();
  }

  async function handleDeleteBudget(id: string) {
    const res = await fetch("/api/finance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteBudget", id }),
    });
    if (res.ok) fetchAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Finance
          </h1>
          <p className="text-muted-foreground">Track income, expenses, and investments</p>
        </div>
        <AddTransaction onAdd={handleAdd} />
      </div>

      <SummaryCards summary={summary} />

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <TransactionList transactions={transactions} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          <Charts transactions={transactions} />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <BudgetTracker
            budgets={budgets}
            transactions={transactions}
            onSetBudget={handleSetBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
