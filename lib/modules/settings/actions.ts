import { getDb } from "@/lib/core/db";
import { settings } from "./schema";
import { eq } from "drizzle-orm";
import { SETTING_DEFAULTS } from "./defaults";

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? SETTING_DEFAULTS[key] ?? null;
}

export async function updateSetting(
  key: string,
  value: string
): Promise<void> {
  const db = getDb();
  db.insert(settings)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: Date.now() },
    })
    .run();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const result = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function deleteSetting(key: string): Promise<void> {
  const db = getDb();
  db.delete(settings).where(eq(settings.key, key)).run();
}
