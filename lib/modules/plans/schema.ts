import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const planPages = sqliteTable("plan_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default("{}"),
  linkedNodeId: text("linked_node_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
