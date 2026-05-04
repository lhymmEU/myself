"use client";

/**
 * One-shot migration that copies any leftover legacy
 * `localStorage["claw-dm-session-names"]` entries up to the
 * server-side `claw_session_meta` table. After a successful upload we
 * clear the local key so subsequent loads short-circuit immediately.
 *
 * The legacy key was scoped to `sessionId` only. To upsert into the
 * server-side store we need `connectionId` + `agentId` too, so we
 * enrich each entry against a live snapshot of `useClawSessions` data.
 * Entries we can't resolve (the session no longer exists remotely) are
 * dropped silently — they're not useful anyway.
 */

const LEGACY_KEY = "claw-dm-session-names";
const MIGRATED_FLAG = "claw-dm-session-names-migrated";

export interface LiveSessionLite {
  agentId?: string;
  key?: string;
}

interface MigrationResult {
  migrated: number;
  skipped: number;
}

export async function migrateLegacySessionNames(
  connectionId: string,
  liveSessions: LiveSessionLite[],
): Promise<MigrationResult | null> {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(MIGRATED_FLAG) === "1") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    window.localStorage.setItem(MIGRATED_FLAG, "1");
    return { migrated: 0, skipped: 0 };
  }

  let names: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") names = parsed;
  } catch {
    return null;
  }

  const lookup = new Map<string, string>();
  for (const s of liveSessions) {
    if (s.key && s.agentId) lookup.set(s.key, s.agentId);
  }

  const records: Array<{
    connectionId: string;
    agentId: string;
    sessionId: string;
    name: string;
  }> = [];
  let skipped = 0;
  for (const [sessionId, name] of Object.entries(names)) {
    if (!name?.trim()) continue;
    const agentId = lookup.get(sessionId);
    if (!agentId) {
      skipped += 1;
      continue;
    }
    records.push({ connectionId, agentId, sessionId, name });
  }

  if (records.length === 0) {
    window.localStorage.setItem(MIGRATED_FLAG, "1");
    window.localStorage.removeItem(LEGACY_KEY);
    return { migrated: 0, skipped };
  }

  try {
    const res = await fetch("/api/claw/sessions/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { imported?: number };
    window.localStorage.setItem(MIGRATED_FLAG, "1");
    window.localStorage.removeItem(LEGACY_KEY);
    return { migrated: data.imported ?? records.length, skipped };
  } catch {
    return null;
  }
}
