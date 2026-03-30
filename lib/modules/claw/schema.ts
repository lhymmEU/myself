import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const cronJobs = sqliteTable("cron_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  command: text("command").notNull(),
  sessionId: text("session_id"),
  agentId: text("agent_id"),
  connectionId: text("connection_id"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
