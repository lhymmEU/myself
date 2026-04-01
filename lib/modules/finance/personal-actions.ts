import { getSqlite } from "@/lib/core/db";
import { randomUUID } from "crypto";

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

// --- Accounts ---

export function getAccounts(): FinanceAccount[] {
  const db = getSqlite();
  return db.prepare("SELECT * FROM finance_accounts ORDER BY created_at DESC").all() as FinanceAccount[];
}

export function getAccount(id: string): FinanceAccount | undefined {
  const db = getSqlite();
  return db.prepare("SELECT * FROM finance_accounts WHERE id = ?").get(id) as FinanceAccount | undefined;
}

export function createAccount(data: Omit<FinanceAccount, "id" | "created_at">): FinanceAccount {
  const db = getSqlite();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO finance_accounts (id, name, type, currency, balance, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.name, data.type, data.currency, data.balance, data.color, data.icon, now);
  return { id, ...data, created_at: now };
}

export function updateAccount(id: string, data: Partial<FinanceAccount>): void {
  const db = getSqlite();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE finance_accounts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteAccount(id: string): void {
  const db = getSqlite();
  db.prepare("DELETE FROM finance_accounts WHERE id = ?").run(id);
}

// --- Transactions ---

export function getTransactions(filters?: {
  account_id?: string;
  type?: string;
  category?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}): FinanceTransaction[] {
  const db = getSqlite();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.account_id) { clauses.push("account_id = ?"); params.push(filters.account_id); }
  if (filters?.type) { clauses.push("type = ?"); params.push(filters.type); }
  if (filters?.category) { clauses.push("category = ?"); params.push(filters.category); }
  if (filters?.from_date) { clauses.push("date >= ?"); params.push(filters.from_date); }
  if (filters?.to_date) { clauses.push("date <= ?"); params.push(filters.to_date); }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters?.limit ? `LIMIT ${filters.limit}` : "LIMIT 200";

  return db.prepare(`SELECT * FROM finance_transactions ${where} ORDER BY date DESC, created_at DESC ${limit}`).all(...params) as FinanceTransaction[];
}

export function createTransaction(data: Omit<FinanceTransaction, "id" | "created_at">): FinanceTransaction {
  const db = getSqlite();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO finance_transactions (id, account_id, type, category, amount, currency, date, description, recurring, recurring_interval, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.account_id, data.type, data.category, data.amount, data.currency, data.date, data.description, data.recurring, data.recurring_interval, now);

  const sign = data.type === "income" ? 1 : -1;
  db.prepare("UPDATE finance_accounts SET balance = balance + ? WHERE id = ?").run(sign * data.amount, data.account_id);

  return { id, ...data, created_at: now };
}

export function deleteTransaction(id: string): void {
  const db = getSqlite();
  const tx = db.prepare("SELECT * FROM finance_transactions WHERE id = ?").get(id) as FinanceTransaction | undefined;
  if (!tx) return;

  const sign = tx.type === "income" ? -1 : 1;
  db.prepare("UPDATE finance_accounts SET balance = balance + ? WHERE id = ?").run(sign * tx.amount, tx.account_id);
  db.prepare("DELETE FROM finance_transactions WHERE id = ?").run(id);
}

// --- Budgets ---

export function getBudgets(): FinanceBudget[] {
  const db = getSqlite();
  return db.prepare("SELECT * FROM finance_budgets ORDER BY category ASC").all() as FinanceBudget[];
}

export function createBudget(data: Omit<FinanceBudget, "id" | "created_at">): FinanceBudget {
  const db = getSqlite();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO finance_budgets (id, category, monthly_limit, currency, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.category, data.monthly_limit, data.currency, now);
  return { id, ...data, created_at: now };
}

export function updateBudget(id: string, data: Partial<FinanceBudget>): void {
  const db = getSqlite();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE finance_budgets SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteBudget(id: string): void {
  const db = getSqlite();
  db.prepare("DELETE FROM finance_budgets WHERE id = ?").run(id);
}

export function getBudgetSpending(category: string, year: number, month: number): number {
  const db = getSqlite();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const result = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense' AND category = ? AND date >= ? AND date < ?"
  ).get(category, startDate, endDate) as { total: number };
  return result.total;
}

// --- Investments ---

export function getInvestments(): FinanceInvestment[] {
  const db = getSqlite();
  return db.prepare("SELECT * FROM finance_investments ORDER BY symbol ASC").all() as FinanceInvestment[];
}

export function createInvestment(data: Omit<FinanceInvestment, "id" | "created_at">): FinanceInvestment {
  const db = getSqlite();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO finance_investments (id, account_id, symbol, shares, avg_cost_basis, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.account_id, data.symbol, data.shares, data.avg_cost_basis, data.currency, now);
  return { id, ...data, created_at: now };
}

export function updateInvestment(id: string, data: Partial<FinanceInvestment>): void {
  const db = getSqlite();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE finance_investments SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteInvestment(id: string): void {
  const db = getSqlite();
  db.prepare("DELETE FROM finance_investments WHERE id = ?").run(id);
}

// --- Summary ---

export function getFinanceSummary() {
  const db = getSqlite();
  const accounts = getAccounts();
  const netWorth = accounts.reduce((sum, a) => sum + (a.type === "credit" ? -a.balance : a.balance), 0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const monthlyIncome = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'income' AND date >= ? AND date < ?"
  ).get(startDate, endDate) as { total: number }).total;

  const monthlyExpense = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense' AND date >= ? AND date < ?"
  ).get(startDate, endDate) as { total: number }).total;

  const categoryBreakdown = db.prepare(
    "SELECT category, SUM(amount) as total FROM finance_transactions WHERE type = 'expense' AND date >= ? AND date < ? GROUP BY category ORDER BY total DESC"
  ).all(startDate, endDate) as { category: string; total: number }[];

  return { netWorth, monthlyIncome, monthlyExpense, categoryBreakdown, accounts };
}
