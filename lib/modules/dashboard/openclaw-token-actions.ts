import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  decryptSettingsSecret,
  encryptSettingsSecret,
} from "@/lib/openclaw/settings-token-crypto";

const SETTING_KEY = "openclaw_supabase_refresh_token";

export async function hasOpenclawRefreshToken(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, SETTING_KEY)))
    .limit(1);
  return Boolean(rows[0]?.value?.trim());
}

export async function getOpenclawRefreshTokenPlain(userId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, SETTING_KEY)))
    .limit(1);
  const raw = rows[0]?.value?.trim();
  if (!raw) return null;
  try {
    return decryptSettingsSecret(raw);
  } catch {
    return null;
  }
}

export async function setOpenclawRefreshToken(
  userId: string,
  plainRefreshToken: string,
): Promise<void> {
  const trimmed = plainRefreshToken.trim();
  if (!trimmed) {
    throw new Error("Refresh token is empty");
  }
  const enc = encryptSettingsSecret(trimmed);
  const db = getDb();
  const now = Date.now();
  await db
    .insert(settings)
    .values({ userId, key: SETTING_KEY, value: enc, updatedAt: now })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value: enc, updatedAt: now },
    });
}

export async function clearOpenclawRefreshToken(userId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, SETTING_KEY)));
}
