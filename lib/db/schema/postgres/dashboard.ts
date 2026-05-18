import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const userWishes = pgTable("user_wishes", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  category: text("category", {
    enum: ["learn", "place", "goal"],
  }).notNull(),
  userDescription: text("user_description").notNull(),
  planData: text("plan_data").notNull().default("{}"),
  /**
   * `"expanding"` — placeholder while the agent watcher fills in `planData`.
   * `"ready"`     — `planData` reflects the latest agent output.
   * `"error"`     — the watcher reported failure; `planData` still empty.
   */
  status: text("status", {
    enum: ["expanding", "ready", "error"],
  })
    .notNull()
    .default("ready"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
