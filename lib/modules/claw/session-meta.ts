/**
 * Friendly session-name persistence for openclaw chats.
 *
 * Replaces the legacy `localStorage["claw-dm-session-names"]` blob so
 * renames travel across devices. Keyed by the openclaw compound session
 * key — a `<connectionId, agentId, sessionId>` triple — which is what
 * `openclaw sessions --json` returns and what the dashboard already
 * caches in SWR. Mode-agnostic: works in both SQLite (local) and
 * Postgres (cloud) via the dual-driver Drizzle handle.
 */
import { nanoid } from "nanoid";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { clawSessionMeta } from "@/lib/db/schema/sqlite/claw";

export interface SessionMetaKey {
  connectionId: string;
  agentId: string;
  sessionId: string;
}

export interface SessionMetaRecord extends SessionMetaKey {
  id: string;
  name: string | null;
  pinnedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SessionMetaPatch {
  name?: string | null;
  pinnedAt?: number | null;
}

function rowToRecord(
  row: typeof clawSessionMeta.$inferSelect,
): SessionMetaRecord {
  return {
    id: row.id,
    connectionId: row.connectionId,
    agentId: row.agentId,
    sessionId: row.sessionId,
    name: row.name ?? null,
    pinnedAt: row.pinnedAt ? Number(row.pinnedAt) : null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function listSessionMeta(
  userId: string = LOCAL_USER_ID,
  connectionId?: string,
): Promise<SessionMetaRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clawSessionMeta)
    .where(
      connectionId
        ? and(
            eq(clawSessionMeta.userId, userId),
            eq(clawSessionMeta.connectionId, connectionId),
          )
        : eq(clawSessionMeta.userId, userId),
    );
  return rows.map(rowToRecord);
}

export async function getSessionMeta(
  key: SessionMetaKey,
  userId: string = LOCAL_USER_ID,
): Promise<SessionMetaRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clawSessionMeta)
    .where(
      and(
        eq(clawSessionMeta.userId, userId),
        eq(clawSessionMeta.connectionId, key.connectionId),
        eq(clawSessionMeta.agentId, key.agentId),
        eq(clawSessionMeta.sessionId, key.sessionId),
      ),
    )
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/**
 * Upsert a session metadata row by compound key. A `null` name field
 * clears the friendly name (revert to default).
 */
export async function upsertSessionMeta(
  key: SessionMetaKey,
  patch: SessionMetaPatch,
  userId: string = LOCAL_USER_ID,
): Promise<SessionMetaRecord> {
  const existing = await getSessionMeta(key, userId);
  const db = getDb();
  const now = Date.now();

  if (existing) {
    const update: Partial<typeof clawSessionMeta.$inferInsert> = {
      updatedAt: now,
    };
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.pinnedAt !== undefined) update.pinnedAt = patch.pinnedAt;
    await db
      .update(clawSessionMeta)
      .set(update)
      .where(eq(clawSessionMeta.id, existing.id));
    return {
      ...existing,
      name: patch.name !== undefined ? patch.name : existing.name,
      pinnedAt: patch.pinnedAt !== undefined ? patch.pinnedAt : existing.pinnedAt,
      updatedAt: now,
    };
  }

  const id = nanoid();
  await db.insert(clawSessionMeta).values({
    id,
    userId,
    connectionId: key.connectionId,
    agentId: key.agentId,
    sessionId: key.sessionId,
    name: patch.name ?? null,
    pinnedAt: patch.pinnedAt ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id,
    connectionId: key.connectionId,
    agentId: key.agentId,
    sessionId: key.sessionId,
    name: patch.name ?? null,
    pinnedAt: patch.pinnedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Bulk-import session names from the legacy localStorage shape:
 *   { [sessionId]: name }
 * Skips entries whose openclaw compound key we can't reconstruct (no
 * connectionId / agentId mapping). Always returns the count we touched.
 */
export async function bulkImportSessionNames(
  entries: Array<SessionMetaKey & { name: string }>,
  userId: string = LOCAL_USER_ID,
): Promise<number> {
  let imported = 0;
  for (const e of entries) {
    if (!e.name?.trim()) continue;
    await upsertSessionMeta(
      {
        connectionId: e.connectionId,
        agentId: e.agentId,
        sessionId: e.sessionId,
      },
      { name: e.name.trim() },
      userId,
    );
    imported += 1;
  }
  return imported;
}

export async function deleteSessionMetaByKeys(
  keys: SessionMetaKey[],
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  if (keys.length === 0) return;
  const db = getDb();
  // Without a tuple `IN ((a, b, c))` clause across both drivers, we
  // delete one-at-a-time. Session deletes are rare so this is fine.
  for (const key of keys) {
    await db
      .delete(clawSessionMeta)
      .where(
        and(
          eq(clawSessionMeta.userId, userId),
          eq(clawSessionMeta.connectionId, key.connectionId),
          eq(clawSessionMeta.agentId, key.agentId),
          eq(clawSessionMeta.sessionId, key.sessionId),
        ),
      );
  }
}

/**
 * Convenience: drop any meta rows for sessionIds no longer present in
 * the openclaw remote listing for this connection. Best-effort cleanup
 * to keep the table from growing without bound when sessions are
 * pruned remotely.
 */
export async function pruneSessionMeta(
  connectionId: string,
  liveSessionIds: string[],
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  const all = await db
    .select()
    .from(clawSessionMeta)
    .where(
      and(
        eq(clawSessionMeta.userId, userId),
        eq(clawSessionMeta.connectionId, connectionId),
      ),
    );
  const liveSet = new Set(liveSessionIds);
  const stale = all.filter((row) => !liveSet.has(row.sessionId));
  if (stale.length === 0) return;
  await db.delete(clawSessionMeta).where(
    and(
      eq(clawSessionMeta.userId, userId),
      eq(clawSessionMeta.connectionId, connectionId),
      inArray(
        clawSessionMeta.id,
        stale.map((r) => r.id),
      ),
    ),
  );
}
