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
  balance: Number(row.balance),
  color: row.color,
  icon: row.icon,
  created_at: Number(row.createdAt),
});

const transactionToApi = (
  row: typeof financeTransactions.$inferSelect,
): FinanceTransaction => ({
  id: row.id,
  account_id: row.accountId,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  currency: row.currency,
  date: row.date,
  description: row.description,
  recurring: Number(row.recurring),
  recurring_interval: row.recurringInterval ?? null,
  created_at: Number(row.createdAt),
});

const budgetToApi = (
  row: typeof financeBudgets.$inferSelect,
): FinanceBudget => ({
  id: row.id,
  category: row.category,
  monthly_limit: Number(row.monthlyLimit),
  currency: row.currency,
  created_at: Number(row.createdAt),
});

const investmentToApi = (
  row: typeof financeInvestments.$inferSelect,
): FinanceInvestment => ({
  id: row.id,
  account_id: row.accountId,
  symbol: row.symbol,
  shares: Number(row.shares),
  avg_cost_basis: Number(row.avgCostBasis),
  currency: row.currency,
  created_at: Number(row.createdAt),
});

// --- Accounts ---

export async function getAccounts(
  userId: string = LOCAL_USER_ID,
): Promise<FinanceAccount[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.userId, userId))
    .orderBy(desc(financeAccounts.createdAt));
  return rows.map(accountToApi);
}

export async function getAccount(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<FinanceAccount | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(financeAccounts)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    )
    .limit(1);
  return rows[0] ? accountToApi(rows[0]) : undefined;
}

export async function createAccount(
  data: Omit<FinanceAccount, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): Promise<FinanceAccount> {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  await db.insert(financeAccounts).values({
    id,
    userId,
    name: data.name,
    type: data.type,
    currency: data.currency,
    balance: data.balance,
    color: data.color,
    icon: data.icon,
    createdAt: now,
  });
  return { id, ...data, created_at: now };
}

export async function updateAccount(
  id: string,
  data: Partial<FinanceAccount>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const updates: Partial<typeof financeAccounts.$inferInsert> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.balance !== undefined) updates.balance = data.balance;
  if (data.color !== undefined) updates.color = data.color;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (Object.keys(updates).length === 0) return;

  const db = getDb();
  await db
    .update(financeAccounts)
    .set(updates)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    );
}

export async function deleteAccount(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(financeAccounts)
    .where(
      and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    );
}

// --- Transactions ---

export async function getTransactions(
  filters?: {
    account_id?: string;
    type?: string;
    category?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  },
  userId: string = LOCAL_USER_ID,
): Promise<FinanceTransaction[]> {
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

  const rows = await db
    .select()
    .from(financeTransactions)
    .where(and(...where))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
    .limit(filters?.limit ?? 200);
  return rows.map(transactionToApi);
}

export async function createTransaction(
  data: Omit<FinanceTransaction, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): Promise<FinanceTransaction> {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  await db.insert(financeTransactions).values({
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
  });

  const sign = data.type === "income" ? 1 : -1;
  await db
    .update(financeAccounts)
    .set({ balance: sql`${financeAccounts.balance} + ${sign * data.amount}` })
    .where(
      and(
        eq(financeAccounts.id, data.account_id),
        eq(financeAccounts.userId, userId),
      ),
    );

  return { id, ...data, created_at: now };
}

export async function deleteTransaction(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  const txRows = await db
    .select()
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.userId, userId),
      ),
    )
    .limit(1);
  const tx = txRows[0];
  if (!tx) return;

  const sign = tx.type === "income" ? -1 : 1;
  await db
    .update(financeAccounts)
    .set({
      balance: sql`${financeAccounts.balance} + ${sign * Number(tx.amount)}`,
    })
    .where(
      and(
        eq(financeAccounts.id, tx.accountId),
        eq(financeAccounts.userId, userId),
      ),
    );
  await db
    .delete(financeTransactions)
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.userId, userId),
      ),
    );
}

// --- Budgets ---

export async function getBudgets(
  userId: string = LOCAL_USER_ID,
): Promise<FinanceBudget[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(financeBudgets)
    .where(eq(financeBudgets.userId, userId))
    .orderBy(financeBudgets.category);
  return rows.map(budgetToApi);
}

export async function createBudget(
  data: Omit<FinanceBudget, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): Promise<FinanceBudget> {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  await db.insert(financeBudgets).values({
    id,
    userId,
    category: data.category,
    monthlyLimit: data.monthly_limit,
    currency: data.currency,
    createdAt: now,
  });
  return { id, ...data, created_at: now };
}

export async function updateBudget(
  id: string,
  data: Partial<FinanceBudget>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const updates: Partial<typeof financeBudgets.$inferInsert> = {};
  if (data.category !== undefined) updates.category = data.category;
  if (data.monthly_limit !== undefined) updates.monthlyLimit = data.monthly_limit;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (Object.keys(updates).length === 0) return;
  const db = getDb();
  await db
    .update(financeBudgets)
    .set(updates)
    .where(
      and(eq(financeBudgets.id, id), eq(financeBudgets.userId, userId)),
    );
}

export async function deleteBudget(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(financeBudgets)
    .where(
      and(eq(financeBudgets.id, id), eq(financeBudgets.userId, userId)),
    );
}

export async function getBudgetSpending(
  category: string,
  year: number,
  month: number,
  userId: string = LOCAL_USER_ID,
): Promise<number> {
  const db = getDb();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const rows = await db
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
    .limit(1);
  return Number(rows[0]?.total ?? 0);
}

// --- Investments ---

export async function getInvestments(
  userId: string = LOCAL_USER_ID,
): Promise<FinanceInvestment[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(financeInvestments)
    .where(eq(financeInvestments.userId, userId))
    .orderBy(financeInvestments.symbol);
  return rows.map(investmentToApi);
}

export async function createInvestment(
  data: Omit<FinanceInvestment, "id" | "created_at">,
  userId: string = LOCAL_USER_ID,
): Promise<FinanceInvestment> {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  await db.insert(financeInvestments).values({
    id,
    userId,
    accountId: data.account_id,
    symbol: data.symbol,
    shares: data.shares,
    avgCostBasis: data.avg_cost_basis,
    currency: data.currency,
    createdAt: now,
  });
  return { id, ...data, created_at: now };
}

export async function updateInvestment(
  id: string,
  data: Partial<FinanceInvestment>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const updates: Partial<typeof financeInvestments.$inferInsert> = {};
  if (data.account_id !== undefined) updates.accountId = data.account_id;
  if (data.symbol !== undefined) updates.symbol = data.symbol;
  if (data.shares !== undefined) updates.shares = data.shares;
  if (data.avg_cost_basis !== undefined)
    updates.avgCostBasis = data.avg_cost_basis;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (Object.keys(updates).length === 0) return;
  const db = getDb();
  await db
    .update(financeInvestments)
    .set(updates)
    .where(
      and(
        eq(financeInvestments.id, id),
        eq(financeInvestments.userId, userId),
      ),
    );
}

export async function deleteInvestment(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(financeInvestments)
    .where(
      and(
        eq(financeInvestments.id, id),
        eq(financeInvestments.userId, userId),
      ),
    );
}

// --- Summary ---

export async function getFinanceSummary(userId: string = LOCAL_USER_ID) {
  const db = getDb();
  const accounts = await getAccounts(userId);
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

  const incomeRows = await db
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
    .limit(1);
  const monthlyIncome = Number(incomeRows[0]?.total ?? 0);

  const expenseRows = await db
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
    .limit(1);
  const monthlyExpense = Number(expenseRows[0]?.total ?? 0);

  const categoryRows = (await db
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
    .orderBy(desc(sql`SUM(${financeTransactions.amount})`))) as {
    category: string;
    total: number | string;
  }[];
  const categoryBreakdown = categoryRows.map((r) => ({
    category: r.category,
    total: Number(r.total),
  }));

  return { netWorth, monthlyIncome, monthlyExpense, categoryBreakdown, accounts };
}
