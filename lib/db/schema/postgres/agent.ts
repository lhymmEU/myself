import { pgTable, text, bigint, uuid, jsonb } from "drizzle-orm/pg-core";

/**
 * One row per user. PK on user_id enforces the "single agent per user" rule.
 * `tokenJti` is the `jti` claim of the long-lived Supabase JWT issued to the
 * agent CLI. RLS policies check `auth.jwt() ->> 'jti'` against this value to
 * invalidate stale tokens after re-pair. The plaintext JWT is shown to the
 * user exactly once at issue time and never stored.
 */
export const agentRegistrations = pgTable("agent_registrations", {
  userId: uuid("user_id").primaryKey(),
  label: text("label").notNull().default(""),
  tokenJti: text("token_jti").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  lastSeenAt: bigint("last_seen_at", { mode: "number" }),
});

/**
 * Durable, ordered queue of events the agent must process. Events are
 * created by the web app whenever the user pushes content (page, marked
 * item, wish, dismissal, regen request, bootstrap). The agent picks them
 * up in `created_at` order, strictly serial per user.
 *
 * Payload storage: inline `payload` JSONB up to ~256KB. Larger payloads
 * are uploaded to Supabase Storage and `blobPath` points to the object.
 * Exactly one of (payload, blobPath) is set for any given row.
 */
export const agentEvents = pgTable("agent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload"),
  blobPath: text("blob_path"),
  sourceRef: jsonb("source_ref"),
  status: text("status").notNull().default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  processedAt: bigint("processed_at", { mode: "number" }),
  error: text("error"),
});

export type AgentEventStatus = "pending" | "processing" | "done" | "error";

export type AgentEventType =
  | "page.upsert"
  | "marked.upsert"
  | "wish.upsert"
  | "wish.expand"
  | "dismissal.create"
  | "regen.cards"
  | "bootstrap.full";
