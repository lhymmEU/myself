import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const planFolders = sqliteTable("plan_folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const planPages = sqliteTable("plan_pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default("{}"),
  linkedNodeId: text("linked_node_id"),
  folderId: text("folder_id"),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
