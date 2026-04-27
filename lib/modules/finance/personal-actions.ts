import { randomUUID } from "crypto";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import {
  financeAccounts,
  financeBudgets,
  financeInvestments,
  financeTransactions,
} from "@/lib/db/schema/sqlite/finance";

export interface FinanceAccount {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "cash";
  currency: string;
  balance: number;
  color: string;
  icon: string;
  created_at: number;
}

export interface FinanceTransaction {
  id: string;
  account_id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  recurring: number;
  recurring_interval: string | null;
  created_at: number;
}

export interface FinanceBudget {
  id: string;
  category: string;
  monthly_limit: number;
  currency: string;
  created_at: number;
}

export interface FinanceInvestment {
  id: string;
  account_id: string;
  symbol: string;
  shares: number;
  avg_cost_basis: number;
  currency: string;
  created_at: number;
}

const accountToApi = (
  row: typeof financeAccounts.$inferSelect,
): FinanceAccount => ({
  id: row.id,
  name: row.name,
  type: row.type,
  currency: row.currency,
  balance: row.balance,
  color: row.color,
  icon: row.icon,
  created_at: row.createdAt,
});

const transactionToApi = (
  row: typeof financeTransactions.$inferSelect,
): FinanceTransaction => ({
  id: row.id,
  account_id: row.accountId,
  type: row.type,
  category: row.category,
  amount: row.amount,
  currency: row.currency,
  date: row.date,
  description: row.description,
  recurring: row.recurring,
  recurring_interval: row.recurringInterval ?? null,
  created_at: row.createdAt,
});

const budgetToApi = (
  row: typeof financeBudgets.$inferSelect,
): FinanceBudget => ({
  id: row.id,
  category: row.category,
  monthly_limit: row.monthlyLimit,
  currency: row.currency,
  created_at: row.createdAt,
});

const investmentToApi = (
  row: typeof financeInvestments.$inferSelect,
): FinanceInvestment => ({
  id: row.id,
  account_id: row.accountId,
  symbol: row.symbol,
  shares: row.shares,
  avg_cost_basis: row.avgCostBasis,
  currency: row.currency,
  created_at: row.createdAt,
});

// --- Accounts ---

export function getAccounts(userId: string = LOCAL_USER_ID): FinanceAccount[] {
  const db = getDb();
  const rows = db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.userId, userId))
    .orderBy(desc(financeAccounts.createdAt))
    .all();
  return rows.map(accountToApi);
}

export function getAccount(
  id: string,
  userId: string = LOCAL_USER_ID,
): FinanceAccount | undefined {
  const db = getDb();
  const row = db
    .select()
    .from(financeAccounts)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    )
    .get();
  return row ? accountToApi(row) : undefined;
}

export function createAccount(
  data: Omit<FinanceAccount, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): FinanceAccount {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.insert(financeAccounts)
    .values({
      id,
      userId,
      name: data.name,
      type: data.type,
      currency: data.currency,
      balance: data.balance,
      color: data.color,
      icon: data.icon,
      createdAt: now,
    })
    .run();
  return { id, ...data, created_at: now };
}

export function updateAccount(
  id: string,
  data: Partial<FinanceAccount>,
  userId: string = LOCAL_USER_ID,
): void {
  const updates: Partial<typeof financeAccounts.$inferInsert> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.balance !== undefined) updates.balance = data.balance;
  if (data.color !== undefined) updates.color = data.color;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (Object.keys(updates).length === 0) return;

  const db = getDb();
  db.update(financeAccounts)
    .set(updates)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    )
    .run();
}

export function deleteAccount(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(financeAccounts)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    )
    .run();
}

// --- Transactions ---

export function getTransactions(
  filters?: {
    account_id?: string;
    type?: string;
    category?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  },
  userId: string = LOCAL_USER_ID,
): FinanceTransaction[] {
  const db = getDb();
  const where = [eq(financeTransactions.userId, userId)];
  if (filters?.account_id)
    where.push(eq(financeTransactions.accountId, filters.account_id));
  if (filters?.type)
    where.push(
      eq(
        financeTransactions.type,
        filters.type as "income" | "expense" | "transfer",
      ),
    );
  if (filters?.category)
    where.push(eq(financeTransactions.category, filters.category));
  if (filters?.from_date)
    where.push(gte(financeTransactions.date, filters.from_date));
  if (filters?.to_date)
    where.push(lt(financeTransactions.date, filters.to_date));

  const rows = db
    .select()
    .from(financeTransactions)
    .where(and(...where))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
    .limit(filters?.limit ?? 200)
    .all();
  return rows.map(transactionToApi);
}

export function createTransaction(
  data: Omit<FinanceTransaction, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): FinanceTransaction {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.insert(financeTransactions)
    .values({
      id,
      userId,
      accountId: data.account_id,
      type: data.type,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      description: data.description,
      recurring: data.recurring,
      recurringInterval: data.recurring_interval ?? null,
      createdAt: now,
    })
    .run();

  const sign = data.type === "income" ? 1 : -1;
  db.update(financeAccounts)
    .set({ balance: sql`${financeAccounts.balance} + ${sign * data.amount}` })
    .where(
      and(
        eq(financeAccounts.id, data.account_id),
        eq(financeAccounts.userId, userId),
      ),
    )
    .run();

  return { id, ...data, created_at: now };
}

export function deleteTransaction(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  const tx = db
    .select()
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.userId, userId),
      ),
    )
    .get();
  if (!tx) return;

  const sign = tx.type === "income" ? -1 : 1;
  db.update(financeAccounts)
    .set({ balance: sql`${financeAccounts.balance} + ${sign * tx.amount}` })
    .where(
      and(
        eq(financeAccounts.id, tx.accountId),
        eq(financeAccounts.userId, userId),
      ),
    )
    .run();
  db.delete(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.userId, userId),
      ),
    )
    .run();
}

// --- Budgets ---

export function getBudgets(userId: string = LOCAL_USER_ID): FinanceBudget[] {
  const db = getDb();
  const rows = db
    .select()
    .from(financeBudgets)
    .where(eq(financeBudgets.userId, userId))
    .orderBy(financeBudgets.category)
    .all();
  return rows.map(budgetToApi);
}

export function createBudget(
  data: Omit<FinanceBudget, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): FinanceBudget {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.insert(financeBudgets)
    .values({
      id,
      userId,
      category: data.category,
      monthlyLimit: data.monthly_limit,
      currency: data.currency,
      createdAt: now,
    })
    .run();
  return { id, ...data, created_at: now };
}

export function updateBudget(
  id: string,
  data: Partial<FinanceBudget>,
  userId: string = LOCAL_USER_ID,
): void {
  const updates: Partial<typeof financeBudgets.$inferInsert> = {};
  if (data.category !== undefined) updates.category = data.category;
  if (data.monthly_limit !== undefined) updates.monthlyLimit = data.monthly_limit;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (Object.keys(updates).length === 0) return;
  const db = getDb();
  db.update(financeBudgets)
    .set(updates)
    .where(
      and(eq(financeBudgets.id, id), eq(financeBudgets.userId, userId)),
    )
    .run();
}

export function deleteBudget(id: string, userId: string = LOCAL_USER_ID): void {
  const db = getDb();
  db.delete(financeBudgets)
    .where(
      and(eq(financeBudgets.id, id), eq(financeBudgets.userId, userId)),
    )
    .run();
}

export function getBudgetSpending(
  category: string,
  year: number,
  month: number,
  userId: string = LOCAL_USER_ID,
): number {
  const db = getDb();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const result = db
    .select({
      total: sql<number>`COALESCE(SUM(${financeTransactions.amount}), 0)`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, userId),
        eq(financeTransactions.type, "expense"),
        eq(financeTransactions.category, category),
        gte(financeTransactions.date, startDate),
        lt(financeTransactions.date, endDate),
      ),
    )
    .get();
  return Number(result?.total ?? 0);
}

// --- Investments ---

export function getInvestments(
  userId: string = LOCAL_USER_ID,
): FinanceInvestment[] {
  const db = getDb();
  const rows = db
    .select()
    .from(financeInvestments)
    .where(eq(financeInvestments.userId, userId))
    .orderBy(financeInvestments.symbol)
    .all();
  return rows.map(investmentToApi);
}

export function createInvestment(
  data: Omit<FinanceInvestment, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): FinanceInvestment {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.insert(financeInvestments)
    .values({
      id,
      userId,
      accountId: data.account_id,
      symbol: data.symbol,
      shares: data.shares,
      avgCostBasis: data.avg_cost_basis,
      currency: data.currency,
      createdAt: now,
    })
    .run();
  return { id, ...data, created_at: now };
}

export function updateInvestment(
  id: string,
  data: Partial<FinanceInvestment>,
  userId: string = LOCAL_USER_ID,
): void {
  const updates: Partial<typeof financeInvestments.$inferInsert> = {};
  if (data.account_id !== undefined) updates.accountId = data.account_id;
  if (data.symbol !== undefined) updates.symbol = data.symbol;
  if (data.shares !== undefined) updates.shares = data.shares;
  if (data.avg_cost_basis !== undefined)
    updates.avgCostBasis = data.avg_cost_basis;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (Object.keys(updates).length === 0) return;
  const db = getDb();
  db.update(financeInvestments)
    .set(updates)
    .where(
      and(
        eq(financeInvestments.id, id),
        eq(financeInvestments.userId, userId),
      ),
    )
    .run();
}

export function deleteInvestment(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(financeInvestments)
    .where(
      and(
        eq(financeInvestments.id, id),
        eq(financeInvestments.userId, userId),
      ),
    )
    .run();
}

// --- Summary ---

export function getFinanceSummary(userId: string = LOCAL_USER_ID) {
  const db = getDb();
  const accounts = getAccounts(userId);
  const netWorth = accounts.reduce(
    (sum, a) => sum + (a.type === "credit" ? -a.balance : a.balance),
    0,
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const monthlyIncome = Number(
    db
      .select({
        total: sql<number>`COALESCE(SUM(${financeTransactions.amount}), 0)`,
      })
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.userId, userId),
          eq(financeTransactions.type, "income"),
          gte(financeTransactions.date, startDate),
          lt(financeTransactions.date, endDate),
        ),
      )
      .get()?.total ?? 0,
  );

  const monthlyExpense = Number(
    db
      .select({
        total: sql<number>`COALESCE(SUM(${financeTransactions.amount}), 0)`,
      })
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.userId, userId),
          eq(financeTransactions.type, "expense"),
          gte(financeTransactions.date, startDate),
          lt(financeTransactions.date, endDate),
        ),
      )
      .get()?.total ?? 0,
  );

  const categoryBreakdown = db
    .select({
      category: financeTransactions.category,
      total: sql<number>`SUM(${financeTransactions.amount})`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, userId),
        eq(financeTransactions.type, "expense"),
        gte(financeTransactions.date, startDate),
        lt(financeTransactions.date, endDate),
      ),
    )
    .groupBy(financeTransactions.category)
    .orderBy(desc(sql`SUM(${financeTransactions.amount})`))
    .all() as { category: string; total: number }[];

  return { netWorth, monthlyIncome, monthlyExpense, categoryBreakdown, accounts };
}
