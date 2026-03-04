import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: ["income", "expense", "investment"],
  }).notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  recurring: integer("recurring", { mode: "boolean" })
    .notNull()
    .default(false),
  linkedNodeId: text("linked_node_id"),
  tags: text("tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  category: text("category").notNull().unique(),
  amount: real("amount").notNull(),
  period: text("period", { enum: ["weekly", "monthly"] })
    .notNull()
    .default("monthly"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
