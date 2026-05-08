/**
 * DB-backed actions for the bento dashboard insights layer.
 *
 * - dashboard_cards is the cache openclaw writes via publishDashboard().
 * - pinned_queries holds the user's saved questions.
 * - card_dismissals is the audit log of user verbs (confirm / contradict /
 *   expand / archive / dismiss / pin / unpin) — read by openclaw on the
 *   next ingest pass so user actions become first-class wiki maintenance.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import {
  dashboardCards,
  pinnedQueries,
  cardDismissals,
} from "@/lib/db/schema/sqlite/insights";
import { appendLog, readWikiPage, writeWikiPage } from "./wiki-vault";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSources(raw: string | null | undefined): SourceRef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as SourceRef[];
    return [];
  } catch {
    return [];
  }
}

function normalizeCard(
  row: typeof dashboardCards.$inferSelect,
): DashboardCard {
  return {
    id: row.id,
    kind: row.kind as CardKind,
    title: row.title,
    body: row.body,
    hue: Number(row.hue),
    freshness: Number(row.freshness),
    confidence: row.confidence as CardConfidence,
    sources: parseSources(row.sourcesJson),
    wikiSlug: row.wikiSlug ?? null,
    pinnedGoalId: row.pinnedGoalId ?? null,
    priority: Number(row.priority),
    state: row.state as DashboardCard["state"],
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
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
    payload = row.payloadJson ? (JSON.parse(row.payloadJson) as Record<string, unknown>) : null;
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

export async function listActiveCards(
  userId: string = LOCAL_USER_ID,
): Promise<DashboardCard[]> {
  const rows = await getDb()
    .select()
    .from(dashboardCards)
    .where(
      and(eq(dashboardCards.userId, userId), eq(dashboardCards.state, "active")),
    )
    .orderBy(desc(dashboardCards.priority), desc(dashboardCards.freshness));
  return rows.map(normalizeCard);
}

export async function getCard(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<DashboardCard | null> {
  const rows = await getDb()
    .select()
    .from(dashboardCards)
    .where(and(eq(dashboardCards.id, id), eq(dashboardCards.userId, userId)))
    .limit(1);
  return rows[0] ? normalizeCard(rows[0]) : null;
}

export async function listPinnedQueries(
  userId: string = LOCAL_USER_ID,
): Promise<PinnedQuery[]> {
  const rows = await getDb()
    .select()
    .from(pinnedQueries)
    .where(eq(pinnedQueries.userId, userId))
    .orderBy(desc(pinnedQueries.createdAt));
  return rows.map(normalizePinned);
}

export async function listPendingDismissals(
  userId: string = LOCAL_USER_ID,
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

const CARD_LIMIT = 9;

/**
 * Bulk replace the active card set. openclaw calls this after every ingest
 * or lint pass. We:
 *   - Cap to CARD_LIMIT cards.
 *   - Soft-delete (state="archived") any active cards not present in the new
 *     set so the UI stops showing them but the dismissal/lint history stays.
 * Wiki/dashboard files are maintained by openclaw on its host only — no local
 * dashboard.json mirror here.
 */
export async function publishDashboard(
  cards: PublishCardInput[],
  userId: string = LOCAL_USER_ID,
): Promise<{ count: number }> {
  const truncated = cards.slice(0, CARD_LIMIT);
  /** Empty publish must not archive existing tiles (openclaw may exit 0 without calling tools). */
  if (truncated.length === 0) {
    return { count: 0 };
  }

  const now = Date.now();
  const db = getDb();

  const incomingIds = new Set<string>();

  for (const input of truncated) {
    const id = input.id ?? nanoid();
    incomingIds.add(id);
    const sources = JSON.stringify(input.sources ?? []);
    const row = {
      id,
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      hue: input.hue ?? 210,
      freshness: input.freshness ?? now,
      confidence: input.confidence ?? "thin",
      sourcesJson: sources,
      wikiSlug: input.wikiSlug ?? null,
      pinnedGoalId: input.pinnedGoalId ?? null,
      priority: input.priority ?? 0,
      state: "active" as const,
      createdAt: now,
      updatedAt: now,
    };

    const existing = await db
      .select()
      .from(dashboardCards)
      .where(and(eq(dashboardCards.id, id), eq(dashboardCards.userId, userId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(dashboardCards)
        .set({
          kind: row.kind,
          title: row.title,
          body: row.body,
          hue: row.hue,
          freshness: row.freshness,
          confidence: row.confidence,
          sourcesJson: row.sourcesJson,
          wikiSlug: row.wikiSlug,
          pinnedGoalId: row.pinnedGoalId,
          priority: row.priority,
          state: "active",
          updatedAt: now,
        })
        .where(
          and(
            eq(dashboardCards.id, id),
            eq(dashboardCards.userId, userId),
          ),
        );
    } else {
      await db.insert(dashboardCards).values(row);
    }
  }

  // Soft-archive cards that aren't in the new set.
  const stale = await db
    .select()
    .from(dashboardCards)
    .where(
      and(eq(dashboardCards.userId, userId), eq(dashboardCards.state, "active")),
    );
  for (const row of stale) {
    if (!incomingIds.has(row.id)) {
      await db
        .update(dashboardCards)
        .set({ state: "archived", updatedAt: now })
        .where(
          and(
            eq(dashboardCards.id, row.id),
            eq(dashboardCards.userId, userId),
          ),
        );
    }
  }

  return { count: truncated.length };
}

/**
 * Parsed dashboard JSON payload (e.g. from agent stdout handoff) applied via
 * {@link publishDashboard}.
 */
export async function importDashboardJsonString(
  userId: string,
  raw: string,
): Promise<
  { ok: true; count: number } | { ok: false; reason: string }
> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: "invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "expected a JSON object" };
  }
  const cards = (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return { ok: false, reason: "no cards in file" };
  }
  try {
    const result = await publishDashboard(cards as PublishCardInput[], userId);
    if (result.count === 0) {
      return { ok: false, reason: "no cards applied" };
    }
    return { ok: true, count: result.count };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "publish failed",
    };
  }
}

export async function archiveCard(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .update(dashboardCards)
    .set({ state: "archived", updatedAt: Date.now() })
    .where(and(eq(dashboardCards.id, id), eq(dashboardCards.userId, userId)));
}

export async function recordVerb(
  cardId: string,
  verb: CardVerb,
  payload: Record<string, unknown> | null,
  userId: string = LOCAL_USER_ID,
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
  if (verb === "archive" || verb === "dismiss") {
    await archiveCard(cardId, userId);
  }
  return normalizeDismissal(row as typeof cardDismissals.$inferSelect);
}

export async function markDismissalsIngested(
  ids: string[],
  userId: string = LOCAL_USER_ID,
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
  userId: string = LOCAL_USER_ID,
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
  appendLog(
    `## [${formatDate(row.createdAt)}] query | ${question.replace(/\n+/g, " ")}`,
  );
  return normalizePinned(row as typeof pinnedQueries.$inferSelect);
}

export async function unpinQuery(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .delete(pinnedQueries)
    .where(and(eq(pinnedQueries.id, id), eq(pinnedQueries.userId, userId)));
}

export async function touchPinnedQuery(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .update(pinnedQueries)
    .set({ lastAnswerAt: Date.now() })
    .where(and(eq(pinnedQueries.id, id), eq(pinnedQueries.userId, userId)));
}

// ---------------------------------------------------------------------------
// Helpers (date formatting for log entries)
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Wiki-vault facade exposed from the same module so the API/tools can import
// from one place.
// ---------------------------------------------------------------------------

export { readWikiPage, writeWikiPage, appendLog, formatDate };
