import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const markedCollections = sqliteTable("marked_collections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  notes: text("notes"),
  slug: text("slug").unique(),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const markedItems = sqliteTable("marked_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  url: text("url").notNull(),
  title: text("title").notNull(),
  sourceTag: text("source_tag"),
  notes: text("notes"),
  favicon: text("favicon"),
  ogImage: text("og_image"),
  ogDescription: text("og_description"),
  collectionId: text("collection_id"),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
