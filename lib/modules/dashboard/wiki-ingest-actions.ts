/**
 * Persists wiki-ingest job status. The actual ingest work runs out-of-band
 * on the user's machine via the agent-watcher: the web app pushes a
 * `regen.cards` event to `agent_events`, the watcher invokes openclaw
 * locally, and the watcher (via the skill) writes results back to
 * `wiki_ingest_state` + dashboard cards.
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { wikiIngestState } from "@/lib/db/schema";

export type WikiIngestStatusValue = "idle" | "processing" | "done" | "error";

export interface WikiIngestStateRow {
  status: WikiIngestStatusValue;
  detail: string;
  updatedAt: number;
  /** Raw `{ "cards": [...] }` string the watcher persists after publishing cards. */
  generativeCardsJson: string | null;
}

export async function getWikiIngestState(
  userId: string,
): Promise<WikiIngestStateRow> {
  const rows = await getDb()
    .select()
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      status: "idle",
      detail: "",
      updatedAt: 0,
      generativeCardsJson: null,
    };
  }
  return {
    status: row.status as WikiIngestStatusValue,
    detail: row.detail,
    updatedAt: Number(row.updatedAt),
    generativeCardsJson: row.generativeCardsJson ?? null,
  };
}

export async function upsertWikiIngestState(
  userId: string,
  status: WikiIngestStatusValue,
  detail: string,
): Promise<void> {
  const now = Date.now();
  const db = getDb();
  const existing = await db
    .select()
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(wikiIngestState)
      .set({ status, detail, updatedAt: now })
      .where(eq(wikiIngestState.userId, userId));
  } else {
    await db.insert(wikiIngestState).values({
      userId,
      status,
      detail,
      updatedAt: now,
    });
  }
}
