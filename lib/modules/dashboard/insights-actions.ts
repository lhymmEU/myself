/**
 * Dashboard insights: generative cards from wiki ingest JSON (stored on
 * `wiki_ingest_state.generative_cards_json`), pinned queries, and card
 * dismissals for the agent. Cards are no longer stored in `dashboard_cards`.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import {
  wikiIngestState,
  pinnedQueries,
  cardDismissals,
} from "@/lib/db/schema/postgres/insights";
import type {
  DashboardCard,
  PinnedQuery,
  CardDismissal,
  PublishCardInput,
  SourceRef,
  CardConfidence,
  CardKind,
  CardVerb,
} from "./insights-types";
import { coerceGenerativePresentation } from "./coerce-generative-presentation";
import { coerceCardsJsonBlock } from "@/lib/claw/dashboard-cards-stdout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Allowed ingest `slot` values → stable per-user card ids. */
const DASHBOARD_CARD_SLOT_RE = /^[a-z0-9_]{1,48}$/;

const CARD_KINDS: ReadonlySet<CardKind> = new Set([
  "synthesis",
  "lint",
  "gap",
  "query",
  "heartbeat",
]);

const HIDE_CARD_VERBS: readonly CardVerb[] = ["archive", "dismiss"];

/** When the model omits or mis-sets `kind`, infer from canonical ingest `slot`. */
function inferKindFromSlot(slot: string): CardKind | null {
  if (slot === "heartbeat") return "heartbeat";
  if (slot === "deviating") return "lint";
  if (
    slot === "current_status" ||
    slot === "going_right" ||
    slot === "suggestions" ||
    slot === "wishes_compass" ||
    slot === "alignment" ||
    slot === "keep_doing" ||
    slot === "stop_doing" ||
    slot === "signals"
  ) {
    return "synthesis";
  }
  return null;
}

function defaultTitleForSlot(slot: string): string {
  const map: Record<string, string> = {
    current_status: "Current status",
    going_right: "What's going right",
    deviating: "What's deviating",
    suggestions: "Suggestions",
    heartbeat: "Heartbeat",
    wishes_compass: "Wishes compass",
    alignment: "Alignment",
    keep_doing: "Keep doing",
    stop_doing: "Stop doing",
    signals: "Signals",
  };
  return map[slot] || slot.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveDashboardCardId(
  userId: string,
  input: Pick<PublishCardInput, "id" | "slot">,
): string {
  const explicit = typeof input.id === "string" ? input.id.trim() : "";
  if (explicit) return explicit;
  const slot = typeof input.slot === "string" ? input.slot.trim() : "";
  if (slot && DASHBOARD_CARD_SLOT_RE.test(slot)) {
    return `${userId}_dash_${slot}`;
  }
  return nanoid();
}

function ingestSlotFromCardId(
  userId: string,
  cardId: string,
): string | null {
  const prefix = `${userId}_dash_`;
  if (!cardId.startsWith(prefix)) return null;
  const slot = cardId.slice(prefix.length);
  return slot && DASHBOARD_CARD_SLOT_RE.test(slot) ? slot : null;
}

const SOURCE_KINDS = new Set(["plan", "marked", "wish", "skill"]);

function parseSourcesFromUnknown(s: unknown): SourceRef[] {
  if (!Array.isArray(s)) return [];
  const out: SourceRef[] = [];
  for (const raw of s) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const kind =
      typeof r.kind === "string" && SOURCE_KINDS.has(r.kind)
        ? (r.kind as SourceRef["kind"])
        : null;
    const id = typeof r.id === "string" ? r.id : null;
    if (!kind || !id) {
      // Tolerate the legacy `{ path, lineFrom, lineTo }` shape that older
      // SKILL.md examples produced: keep a label derived from `path` so the
      // chip still has *something* to render, even if we can't deep-link.
      const path = typeof r.path === "string" ? r.path : null;
      if (path) {
        out.push({ kind: "plan", id: path, label: path });
      }
      continue;
    }
    out.push({
      kind,
      id,
      range: typeof r.range === "string" ? r.range : undefined,
      label: typeof r.label === "string" ? r.label : undefined,
    });
  }
  return out;
}

function coerceConfidence(v: unknown): CardConfidence {
  if (v === "strong" || v === "thin" || v === "contradicted") return v;
  return "thin";
}

function looseObjectToPublishInput(o: Record<string, unknown>): PublishCardInput | null {
  const slot = typeof o.slot === "string" ? o.slot.trim() : "";
  let kindStr = typeof o.kind === "string" ? o.kind.trim().toLowerCase() : "";
  if (kindStr && !CARD_KINDS.has(kindStr as CardKind)) {
    kindStr = "";
  }
  if (!kindStr) {
    const inferred = slot ? inferKindFromSlot(slot) : null;
    if (inferred) kindStr = inferred;
  }
  if (!kindStr || !CARD_KINDS.has(kindStr as CardKind)) return null;

  const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
  const title =
    titleRaw || (slot ? defaultTitleForSlot(slot) : "") || "Insight";

  return {
    id: typeof o.id === "string" ? o.id : undefined,
    slot: slot || undefined,
    kind: kindStr as CardKind,
    title,
    body: typeof o.body === "string" ? o.body : undefined,
    hue: typeof o.hue === "number" ? o.hue : undefined,
    freshness: typeof o.freshness === "number" ? o.freshness : undefined,
    confidence: coerceConfidence(o.confidence),
    sources: parseSourcesFromUnknown(o.sources),
    wikiSlug:
      o.wikiSlug === null || typeof o.wikiSlug === "string"
        ? (o.wikiSlug as string | null)
        : undefined,
    pinnedGoalId:
      o.pinnedGoalId === null || typeof o.pinnedGoalId === "string"
        ? (o.pinnedGoalId as string | null)
        : undefined,
    priority: typeof o.priority === "number" ? o.priority : undefined,
    presentation: coerceGenerativePresentation(o.presentation),
    richMarkdown: o.richMarkdown === true,
  };
}

function publishInputToDashboardCard(
  userId: string,
  input: PublishCardInput,
  materializeAt: number,
): DashboardCard {
  const id = resolveDashboardCardId(userId, input);
  const now = materializeAt;
  return {
    id,
    ingestSlot: ingestSlotFromCardId(userId, id),
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    hue: input.hue ?? 210,
    freshness: input.freshness ?? now,
    confidence: input.confidence ?? "thin",
    sources: input.sources ?? [],
    wikiSlug: input.wikiSlug ?? null,
    pinnedGoalId: input.pinnedGoalId ?? null,
    priority: input.priority ?? 0,
    state: "active",
    createdAt: now,
    updatedAt: now,
    presentation: input.presentation ?? null,
    richMarkdown: input.richMarkdown === true,
  };
}

async function listHiddenCardIds(userId: string): Promise<Set<string>> {
  const rows = await getDb()
    .select({ cardId: cardDismissals.cardId })
    .from(cardDismissals)
    .where(
      and(
        eq(cardDismissals.userId, userId),
        inArray(cardDismissals.verb, HIDE_CARD_VERBS),
      ),
    );
  return new Set(rows.map((r) => r.cardId));
}

async function persistGenerativeCardsPayload(
  userId: string,
  payload: { cards: PublishCardInput[] },
): Promise<void> {
  const json = JSON.stringify(payload);
  const db = getDb();
  const existing = await db
    .select()
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(wikiIngestState)
      .set({ generativeCardsJson: json })
      .where(eq(wikiIngestState.userId, userId));
  } else {
    await db.insert(wikiIngestState).values({
      userId,
      status: "idle",
      detail: "",
      generativeCardsJson: json,
      updatedAt: Date.now(),
    });
  }
}

function normalizePinned(
  row: typeof pinnedQueries.$inferSelect,
): PinnedQuery {
  return {
    id: row.id,
    question: row.question,
    wikiSlug: row.wikiSlug ?? null,
    lastAnswerAt: row.lastAnswerAt != null ? Number(row.lastAnswerAt) : null,
    createdAt: Number(row.createdAt),
  };
}

function normalizeDismissal(
  row: typeof cardDismissals.$inferSelect,
): CardDismissal {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = row.payloadJson
      ? (JSON.parse(row.payloadJson) as Record<string, unknown>)
      : null;
  } catch {
    payload = null;
  }
  return {
    id: row.id,
    cardId: row.cardId,
    verb: row.verb as CardVerb,
    payload,
    createdAt: Number(row.createdAt),
    ingested: Number(row.ingested) > 0,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const CARD_LIMIT = 5;

export async function listActiveCards(
  userId: string,
): Promise<DashboardCard[]> {
  const hidden = await listHiddenCardIds(userId);
  const rows = await getDb()
    .select({ g: wikiIngestState.generativeCardsJson })
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);
  const raw = rows[0]?.g;
  if (!raw) return [];

  let parsed: { cards?: unknown[] };
  try {
    parsed = JSON.parse(raw) as { cards?: unknown[] };
  } catch {
    return [];
  }

  const materializeAt = Date.now();
  const inputs: PublishCardInput[] = [];
  for (const item of parsed.cards ?? []) {
    if (!item || typeof item !== "object") continue;
    const conv = looseObjectToPublishInput(item as Record<string, unknown>);
    if (conv) inputs.push(conv);
    if (inputs.length >= CARD_LIMIT) break;
  }

  return inputs
    .map((input) => publishInputToDashboardCard(userId, input, materializeAt))
    .filter((c) => !hidden.has(c.id))
    .sort((a, b) => b.priority - a.priority || b.freshness - a.freshness);
}

export async function getCard(
  id: string,
  userId: string,
): Promise<DashboardCard | null> {
  const cards = await listActiveCards(userId);
  return cards.find((c) => c.id === id) ?? null;
}

export async function listPinnedQueries(
  userId: string,
): Promise<PinnedQuery[]> {
  const rows = await getDb()
    .select()
    .from(pinnedQueries)
    .where(eq(pinnedQueries.userId, userId))
    .orderBy(desc(pinnedQueries.createdAt));
  return rows.map(normalizePinned);
}

export async function listPendingDismissals(
  userId: string,
): Promise<CardDismissal[]> {
  const rows = await getDb()
    .select()
    .from(cardDismissals)
    .where(
      and(eq(cardDismissals.userId, userId), eq(cardDismissals.ingested, 0)),
    )
    .orderBy(asc(cardDismissals.createdAt));
  return rows.map(normalizeDismissal);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Replace the active generative card set (from wiki ingest / smoke tests).
 * Empty input is a no-op so accidental clears never wipe the last good set.
 */
export async function publishDashboard(
  cards: PublishCardInput[],
  userId: string,
): Promise<{ count: number }> {
  const truncated = cards.slice(0, CARD_LIMIT);
  if (truncated.length === 0) {
    return { count: 0 };
  }
  await persistGenerativeCardsPayload(userId, { cards: truncated });
  return { count: truncated.length };
}

/**
 * Parsed dashboard JSON (e.g. remote `cards.json` or smoke payloads) persisted to
 * {@link wikiIngestState.generativeCardsJson}.
 */
export async function importDashboardJsonString(
  userId: string,
  raw: string,
): Promise<
  { ok: true; count: number } | { ok: false; reason: string }
> {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    const coerced = coerceCardsJsonBlock(trimmed);
    if (!coerced) {
      return { ok: false, reason: "invalid JSON" };
    }
    try {
      parsed = JSON.parse(coerced) as unknown;
    } catch {
      return { ok: false, reason: "invalid JSON" };
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "expected a JSON object" };
  }
  const cards = (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return { ok: false, reason: "no cards in file" };
  }
  const inputs: PublishCardInput[] = [];
  for (const item of cards) {
    if (!item || typeof item !== "object") continue;
    const conv = looseObjectToPublishInput(item as Record<string, unknown>);
    if (conv) inputs.push(conv);
    if (inputs.length >= CARD_LIMIT) break;
  }
  if (inputs.length === 0) {
    return { ok: false, reason: "no valid cards" };
  }
  try {
    await persistGenerativeCardsPayload(userId, { cards: inputs });
    return { ok: true, count: inputs.length };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "publish failed",
    };
  }
}

export async function recordVerb(
  cardId: string,
  verb: CardVerb,
  payload: Record<string, unknown> | null,
  userId: string,
): Promise<CardDismissal> {
  const id = nanoid();
  const row = {
    id,
    userId,
    cardId,
    verb,
    payloadJson: payload ? JSON.stringify(payload) : "",
    createdAt: Date.now(),
    ingested: 0,
  };
  await getDb().insert(cardDismissals).values(row);
  return normalizeDismissal(row as typeof cardDismissals.$inferSelect);
}

export async function markDismissalsIngested(
  ids: string[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  for (const id of ids) {
    await db
      .update(cardDismissals)
      .set({ ingested: 1 })
      .where(
        and(
          eq(cardDismissals.id, id),
          eq(cardDismissals.userId, userId),
        ),
      );
  }
}

// ---------------------------------------------------------------------------
// Pinned queries
// ---------------------------------------------------------------------------

export async function pinQuery(
  question: string,
  wikiSlug: string | null,
  userId: string,
): Promise<PinnedQuery> {
  const id = nanoid();
  const row = {
    id,
    userId,
    question,
    wikiSlug,
    lastAnswerAt: null,
    createdAt: Date.now(),
  };
  await getDb().insert(pinnedQueries).values(row);
  return normalizePinned(row as typeof pinnedQueries.$inferSelect);
}

export async function unpinQuery(
  id: string,
  userId: string,
): Promise<void> {
  await getDb()
    .delete(pinnedQueries)
    .where(and(eq(pinnedQueries.id, id), eq(pinnedQueries.userId, userId)));
}

export async function touchPinnedQuery(
  id: string,
  userId: string,
): Promise<void> {
  await getDb()
    .update(pinnedQueries)
    .set({ lastAnswerAt: Date.now() })
    .where(and(eq(pinnedQueries.id, id), eq(pinnedQueries.userId, userId)));
}

// ---------------------------------------------------------------------------
// Helpers (date formatting for log entries)
// ---------------------------------------------------------------------------

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Wiki-vault facade (no-op / null — wiki lives on OpenClaw host only).
// ---------------------------------------------------------------------------

export { readWikiPage, writeWikiPage, appendLog } from "./wiki-vault";
