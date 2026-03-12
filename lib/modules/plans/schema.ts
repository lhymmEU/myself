import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const planPages = sqliteTable("plan_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default("{}"),
  linkedNodeId: text("linked_node_id"),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
