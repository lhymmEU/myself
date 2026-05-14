import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string, ...aliases: string[]): string {
  for (const n of [name, ...aliases]) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  throw new Error(`Missing required env: ${name}`);
}

/** JWT `exp` (seconds since epoch), or null if payload cannot be read. */
function jwtExpSeconds(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const seg = parts[1]!;
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = JSON.parse(
      Buffer.from(b64 + pad, "base64").toString("utf8"),
    ) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** True if access JWT is absent, unreadable, or not yet within skew of expiry. */
function accessJwtStillGood(jwt: string, skewSec = 120): boolean {
  const exp = jwtExpSeconds(jwt);
  if (exp == null) return true;
  return Date.now() / 1000 + skewSec < exp;
}

/**
 * Supabase client authenticated as the dashboard user (RLS uses auth.uid()).
 *
 * Prefer `SUPABASE_ACCESS_TOKEN` when fresh (safe across many `tsx` runs).
 * If the access JWT is expired (or missing) and `SUPABASE_REFRESH_TOKEN` is
 * set, calls `refreshSession` once and returns a client with the new session.
 */
export async function createUserSupabase(): Promise<SupabaseClient> {
  const url = env(
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const anon = env(
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  const access = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const refresh = process.env.SUPABASE_REFRESH_TOKEN?.trim();

  if (access && accessJwtStillGood(access)) {
    return createClient(url, anon, {
      global: {
        headers: { Authorization: `Bearer ${access}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (refresh) {
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refresh,
    });
    if (error || !data.session) {
      throw new Error(error?.message ?? "refreshSession failed");
    }
    return supabase;
  }

  if (access) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN is expired or near expiry; export SUPABASE_REFRESH_TOKEN from the same ingest message (or run a new ingest) so scripts can refresh once.",
    );
  }

  throw new Error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_REFRESH_TOKEN");
}
