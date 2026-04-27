import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed", { mode: "number" }).notNull().default(0),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"],
  })
    .notNull()
    .default("medium"),
  dueDate: text("due_date"),
  source: text("source", { enum: ["manual", "auto"] })
    .notNull()
    .default("manual"),
  linkedNodeId: text("linked_node_id"),
  llmReasoning: text("llm_reasoning"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
