import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly"] })
    .notNull()
    .default("daily"),
  completions: text("completions").notNull().default("[]"),
  linkedNodeId: text("linked_node_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
