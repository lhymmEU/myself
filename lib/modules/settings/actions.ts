import { and, eq } from "drizzle-orm";
import { getDb, getSqlite } from "@/lib/db";
import { isLocal, LOCAL_USER_ID } from "@/lib/core/runtime";
import { settings } from "./schema";
import { SETTING_DEFAULTS } from "./defaults";

/**
 * Async-everywhere setting lookup. Works in both local (better-sqlite3 sync
 * underneath an awaitable Drizzle chain) and cloud (postgres-js) modes.
 */
export async function getSetting(
  key: string,
  userId: string = LOCAL_USER_ID,
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .limit(1);
  return rows[0]?.value ?? SETTING_DEFAULTS[key] ?? null;
}

/**
 * Local-only sync read. Throws in cloud mode.
 *
 * Some local-only call sites (nodemailer transport setup, OpenRouter LLM
 * client, OpenBB sidecar URL) want a synchronous read because their
 * surrounding code was never written to be async-aware. Those paths are
 * already gated by `isLocal()` upstream, so a sync read against the raw
 * better-sqlite3 handle is safe and avoids cascading async refactors into
 * unrelated modules.
 */
export function getSettingSync(
  key: string,
  userId: string = LOCAL_USER_ID,
): string | null {
  if (!isLocal()) {
    throw new Error(
      "getSettingSync is only available in local mode. Use getSetting (async) in cloud paths.",
    );
  }
  const sqlite = getSqlite();
  const row = sqlite
    .prepare(
      "SELECT value FROM settings WHERE user_id = ? AND key = ? LIMIT 1",
    )
    .get(userId, key) as { value: string } | undefined;
  return row?.value ?? SETTING_DEFAULTS[key] ?? null;
}

export async function updateSetting(
  key: string,
  value: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db
    .insert(settings)
    .values({ userId, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value, updatedAt: now },
    });
}

export async function getAllSettings(
  userId: string = LOCAL_USER_ID,
): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));
  const result = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function deleteSetting(
  key: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)));
}
