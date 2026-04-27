import {
  pgTable,
  text,
  bigint,
  doublePrecision,
  uuid,
} from "drizzle-orm/pg-core";

export const financeAccounts = pgTable("finance_accounts", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "credit", "investment", "cash"],
  })
    .notNull()
    .default("checking"),
  currency: text("currency").notNull().default("USD"),
  balance: doublePrecision("balance").notNull().default(0),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("wallet"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const financeTransactions = pgTable("finance_transactions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => financeAccounts.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense", "transfer"] })
    .notNull()
    .default("expense"),
  category: text("category").notNull().default("other"),
  amount: doublePrecision("amount").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  date: text("date").notNull(),
  description: text("description").notNull().default(""),
  recurring: bigint("recurring", { mode: "number" }).notNull().default(0),
  recurringInterval: text("recurring_interval"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const financeBudgets = pgTable("finance_budgets", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  category: text("category").notNull(),
  monthlyLimit: doublePrecision("monthly_limit").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const financeInvestments = pgTable("finance_investments", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => financeAccounts.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  shares: doublePrecision("shares").notNull().default(0),
  avgCostBasis: doublePrecision("avg_cost_basis").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
