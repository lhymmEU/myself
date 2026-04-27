import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * Settings are user-scoped in cloud mode and global in local mode. The
 * "local-user" sentinel keeps the schema identical in both modes; the
 * composite primary key ensures different users can hold the same key.
 */
export const settings = sqliteTable(
  "settings",
  {
    userId: text("user_id").notNull().default("local-user"),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);
