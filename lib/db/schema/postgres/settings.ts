import { pgTable, text, bigint, uuid, primaryKey } from "drizzle-orm/pg-core";

export const settings = pgTable(
  "settings",
  {
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);
