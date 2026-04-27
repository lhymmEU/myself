import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const financeAccounts = sqliteTable("finance_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "credit", "investment", "cash"],
  })
    .notNull()
    .default("checking"),
  currency: text("currency").notNull().default("USD"),
  balance: real("balance").notNull().default(0),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("wallet"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const financeTransactions = sqliteTable("finance_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  accountId: text("account_id")
    .notNull()
    .references(() => financeAccounts.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense", "transfer"] })
    .notNull()
    .default("expense"),
  category: text("category").notNull().default("other"),
  amount: real("amount").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  date: text("date").notNull(),
  description: text("description").notNull().default(""),
  recurring: integer("recurring", { mode: "number" }).notNull().default(0),
  recurringInterval: text("recurring_interval"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const financeBudgets = sqliteTable("finance_budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  category: text("category").notNull(),
  monthlyLimit: real("monthly_limit").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const financeInvestments = sqliteTable("finance_investments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  accountId: text("account_id")
    .notNull()
    .references(() => financeAccounts.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  shares: real("shares").notNull().default(0),
  avgCostBasis: real("avg_cost_basis").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
