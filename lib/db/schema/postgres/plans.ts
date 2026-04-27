import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const planFolders = pgTable("plan_folders", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const planPages = pgTable("plan_pages", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default("{}"),
  linkedNodeId: text("linked_node_id"),
  folderId: text("folder_id"),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
