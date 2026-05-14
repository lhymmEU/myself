import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const pinnedQueries = pgTable("pinned_queries", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  question: text("question").notNull(),
  wikiSlug: text("wiki_slug"),
  lastAnswerAt: bigint("last_answer_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const cardDismissals = pgTable("card_dismissals", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  cardId: text("card_id").notNull(),
  verb: text("verb").notNull(),
  payloadJson: text("payload_json").default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  ingested: bigint("ingested", { mode: "number" }).notNull().default(0),
});

export const wikiIngestState = pgTable("wiki_ingest_state", {
  userId: uuid("user_id").primaryKey(),
  status: text("status").notNull().default("idle"),
  detail: text("detail").notNull().default(""),
  /** Raw `{ "cards": PublishCardInput[] }` from wiki ingest (remote `cards.json`). */
  generativeCardsJson: text("generative_cards_json"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
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
