import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/core/auth";
import { settings } from "./schema";
import { SETTING_DEFAULTS } from "./defaults";

async function resolveUserId(userId?: string): Promise<string> {
  return userId ?? (await getUserId());
}

export async function getSetting(
  key: string,
  userId?: string,
): Promise<string | null> {
  const uid = await resolveUserId(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, uid), eq(settings.key, key)))
    .limit(1);
  return rows[0]?.value ?? SETTING_DEFAULTS[key] ?? null;
}

export async function updateSetting(
  key: string,
  value: string,
  userId?: string,
): Promise<void> {
  const uid = await resolveUserId(userId);
  const db = getDb();
  const now = Date.now();
  await db
    .insert(settings)
    .values({ userId: uid, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value, updatedAt: now },
    });
}

export async function getAllSettings(userId?: string): Promise<Record<string, string>> {
  const uid = await resolveUserId(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, uid));
  const result = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function deleteSetting(key: string, userId?: string): Promise<void> {
  const uid = await resolveUserId(userId);
  const db = getDb();
  await db
    .delete(settings)
    .where(and(eq(settings.userId, uid), eq(settings.key, key)));
}
