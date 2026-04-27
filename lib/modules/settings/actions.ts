import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { settings } from "./schema";
import { SETTING_DEFAULTS } from "./defaults";

export function getSetting(
  key: string,
  userId: string = LOCAL_USER_ID,
): string | null {
  const db = getDb();
  const row = db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .get();
  return row?.value ?? SETTING_DEFAULTS[key] ?? null;
}

export async function updateSetting(
  key: string,
  value: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  db.insert(settings)
    .values({ userId, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value, updatedAt: now },
    })
    .run();
}

export async function getAllSettings(
  userId: string = LOCAL_USER_ID,
): Promise<Record<string, string>> {
  const db = getDb();
  const rows = db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .all();
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
  db.delete(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .run();
}
