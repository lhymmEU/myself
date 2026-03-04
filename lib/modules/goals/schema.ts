import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  targetDate: text("target_date").notNull(),
  progress: integer("progress").notNull().default(0),
  milestones: text("milestones").notNull().default("[]"),
  linkedNodeId: text("linked_node_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
