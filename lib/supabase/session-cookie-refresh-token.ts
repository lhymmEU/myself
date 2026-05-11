/**
 * Read `refresh_token` from Supabase Auth browser cookie value(s).
 * Matches how @supabase/ssr stores `sb-<ref>-auth-token` (optionally chunked as `.0`, `.1`, …).
 */

function tryParseSessionJson(json: string): string | null {
  try {
    const j = JSON.parse(json) as { refresh_token?: unknown };
    if (typeof j.refresh_token === "string" && j.refresh_token.length > 0) {
      return j.refresh_token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Decode a single cookie value (may be `base64-<payload>` or raw JSON). */
export function refreshTokenFromAuthCookieValue(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const direct = tryParseSessionJson(t);
  if (direct) return direct;
  const b64 =
    t.startsWith("base64-") ? t.slice("base64-".length).trim() : t;
  try {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const json = Buffer.from(padded + "=".repeat(padLen), "base64").toString(
      "utf8",
    );
    return tryParseSessionJson(json);
  } catch {
    return null;
  }
}

function isAuthTokenCookieName(name: string): boolean {
  return /^sb-.+-auth-token(?:\.\d+)?$/.test(name);
}

function baseNameAndChunk(name: string): { base: string; chunk: number } {
  const m = name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
  if (!m) return { base: name, chunk: 0 };
  return { base: m[1], chunk: m[2] ? parseInt(m[2], 10) : 0 };
}

/**
 * @param cookieList from `cookies().getAll()` or request cookie list
 */
export function extractRefreshTokenFromSupabaseAuthCookies(
  cookieList: ReadonlyArray<{ name: string; value: string }>,
): string | null {
  const groups = new Map<string, Array<{ chunk: number; value: string }>>();
  for (const c of cookieList) {
    if (!isAuthTokenCookieName(c.name)) continue;
    const { base, chunk } = baseNameAndChunk(c.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push({ chunk, value: c.value });
  }
  for (const parts of groups.values()) {
    parts.sort((a, b) => a.chunk - b.chunk);
    const combined = parts.map((p) => p.value).join("");
    const rt = refreshTokenFromAuthCookieValue(combined);
    if (rt) return rt;
  }
  return null;
}
