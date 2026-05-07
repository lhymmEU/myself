import { getSetting, updateSetting } from "@/lib/modules/settings/actions";

function settingsKey(connectionId: string): string {
  return `claw.sessionLabels:${connectionId}`;
}

export async function getSessionLabelMap(
  connectionId: string,
  userId: string,
): Promise<Record<string, string>> {
  const raw = await getSetting(settingsKey(connectionId), userId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Set or clear a display label for a session key. Empty / null label removes the entry.
 */
export async function setSessionLabel(
  connectionId: string,
  sessionKey: string,
  label: string | null,
  userId: string,
): Promise<Record<string, string>> {
  const map = await getSessionLabelMap(connectionId, userId);
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    delete map[sessionKey];
  } else {
    map[sessionKey] = trimmed;
  }
  await updateSetting(settingsKey(connectionId), JSON.stringify(map), userId);
  return map;
}
