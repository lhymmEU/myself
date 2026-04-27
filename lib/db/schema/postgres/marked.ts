import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const markedCollections = pgTable("marked_collections", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  slug: text("slug").unique(),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const markedItems = pgTable("marked_items", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  sourceTag: text("source_tag"),
  notes: text("notes"),
  favicon: text("favicon"),
  ogImage: text("og_image"),
  ogDescription: text("og_description"),
  collectionId: text("collection_id"),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
