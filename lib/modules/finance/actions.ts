import { nanoid } from "nanoid";
import { eq, and, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import { transactions, budgets } from "./schema";
import { FINANCE_EVENTS } from "./events";
import type {
  Transaction,
  CreateTransactionInput,
  Budget,
  FinancialSummary,
} from "./types";

function rowToTransaction(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction["type"],
    amount: row.amount,
    category: row.category,
    description: row.description ?? undefined,
    date: row.date,
    recurring: row.recurring,
    linkedNodeId: row.linkedNodeId ?? undefined,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.createdAt,
  };
}

function rowToBudget(row: typeof budgets.$inferSelect): Budget {
  return {
    id: row.id,
    category: row.category,
    amount: row.amount,
    period: row.period as Budget["period"],
    createdAt: row.createdAt,
  };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = getDb();
  const rows = db.select().from(transactions).all();
  return rows.map(rowToTransaction);
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  const transaction: typeof transactions.$inferInsert = {
    id,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description,
    date: input.date,
    recurring: input.recurring ?? false,
    linkedNodeId: input.linkedNodeId,
    tags: input.tags ?? [],
    createdAt: now,
  };
  db.insert(transactions).values(transaction).run();
  const result: Transaction = {
    id,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description,
    date: input.date,
    recurring: input.recurring ?? false,
    linkedNodeId: input.linkedNodeId,
    tags: input.tags ?? [],
    createdAt: now,
  };
  await eventBus.emit("finance", FINANCE_EVENTS.TRANSACTION_CREATED, result);
  return result;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();
  db.delete(transactions).where(eq(transactions.id, id)).run();
  await eventBus.emit("finance", FINANCE_EVENTS.TRANSACTION_DELETED, { id });
}

export async function getTransactionsByDateRange(
  start: string,
  end: string
): Promise<Transaction[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(transactions)
    .where(
      and(gte(transactions.date, start), lte(transactions.date, end))
    )
    .all();
  return rows.map(rowToTransaction);
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const db = getDb();
  const rows = db.select().from(transactions).all();
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalInvestments = 0;
  for (const row of rows) {
    if (row.type === "income") totalIncome += row.amount;
    else if (row.type === "expense") totalExpenses += row.amount;
    else if (row.type === "investment") totalInvestments += row.amount;
  }
  const savingsRate =
    totalIncome > 0
      ? ((totalIncome - totalExpenses) / totalIncome) * 100
      : 0;
  const netWorth = totalIncome - totalExpenses + totalInvestments;
  return {
    totalIncome,
    totalExpenses,
    totalInvestments,
    savingsRate,
    netWorth,
  };
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = getDb();
  const rows = db.select().from(budgets).all();
  return rows.map(rowToBudget);
}

export async function setBudget(
  category: string,
  amount: number,
  period: "weekly" | "monthly" = "monthly"
): Promise<Budget> {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .select()
    .from(budgets)
    .where(eq(budgets.category, category))
    .get();
  if (existing) {
    db.update(budgets)
      .set({ amount, period, createdAt: now })
      .where(eq(budgets.id, existing.id))
      .run();
    const result: Budget = {
      id: existing.id,
      category: existing.category,
      amount,
      period,
      createdAt: now,
    };
    await eventBus.emit("finance", FINANCE_EVENTS.BUDGET_UPDATED, result);
    return result;
  }
  const id = nanoid();
  const budget: typeof budgets.$inferInsert = {
    id,
    category,
    amount,
    period,
    createdAt: now,
  };
  db.insert(budgets).values(budget).run();
  const result: Budget = {
    id,
    category,
    amount,
    period,
    createdAt: now,
  };
  await eventBus.emit("finance", FINANCE_EVENTS.BUDGET_UPDATED, result);
  return result;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = getDb();
  db.delete(budgets).where(eq(budgets.id, id)).run();
}
