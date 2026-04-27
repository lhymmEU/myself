import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  completed: bigint("completed", { mode: "number" }).notNull().default(0),
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
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
