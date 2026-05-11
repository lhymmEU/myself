/** Parse wish `plan_data` JSON into a flat string map (client + server safe). */

export function parsePlanDataJson(raw: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    return {};
  }
  return normalizeToFlatStringRecord(parsed);
}

export function normalizeToFlatStringRecord(obj: unknown): Record<string, string> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === "string") {
      out[k] = v;
    } else if (v === null || v === undefined) {
      out[k] = "";
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    }
  }
  return out;
}
