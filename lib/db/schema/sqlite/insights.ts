import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * The bento dashboard's card cache, written by openclaw via publishDashboard
 * and read by the UI. Mirrors `data/wiki/dashboard.json` for fast reads.
 */
export const dashboardCards = sqliteTable("dashboard_cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  hue: integer("hue", { mode: "number" }).notNull().default(210),
  freshness: integer("freshness", { mode: "number" }).notNull(),
  confidence: text("confidence").notNull().default("thin"),
  sourcesJson: text("sources_json").notNull().default("[]"),
  wikiSlug: text("wiki_slug"),
  pinnedGoalId: text("pinned_goal_id"),
  priority: integer("priority", { mode: "number" }).notNull().default(0),
  state: text("state").notNull().default("active"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const pinnedQueries = sqliteTable("pinned_queries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  question: text("question").notNull(),
  wikiSlug: text("wiki_slug"),
  lastAnswerAt: integer("last_answer_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const cardDismissals = sqliteTable("card_dismissals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  cardId: text("card_id").notNull(),
  verb: text("verb").notNull(),
  payloadJson: text("payload_json").default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  ingested: integer("ingested", { mode: "number" }).notNull().default(0),
});

/** Latest background wiki-ingest job status (one row per user). */
export const wikiIngestState = sqliteTable("wiki_ingest_state", {
  userId: text("user_id").primaryKey().default("local-user"),
  status: text("status").notNull().default("idle"),
  detail: text("detail").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export type CardKind =
  | "synthesis"
  | "lint"
  | "gap"
  | "query"
  | "heartbeat";

export type CardConfidence = "strong" | "thin" | "contradicted";

export type CardState = "active" | "archived";

export type CardVerb =
  | "confirm"
  | "contradict"
  | "expand"
  | "archive"
  | "dismiss"
  | "pin"
  | "unpin";
