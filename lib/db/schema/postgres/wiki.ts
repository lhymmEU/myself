import { pgTable, text, bigint, uuid, primaryKey } from "drizzle-orm/pg-core";

/** User-scoped wiki markdown pages (replaces filesystem `data/wiki/**`). */
export const wikiPages = pgTable(
  "wiki_pages",
  {
    userId: uuid("user_id").notNull(),
    slug: text("slug").notNull(),
    markdown: text("markdown").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.slug] })],
);

/** Append-only wiki maintenance / ingest log lines per user. */
export const wikiLogEntries = pgTable("wiki_log_entries", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
