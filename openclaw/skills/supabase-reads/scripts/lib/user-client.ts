import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string, ...aliases: string[]): string {
  for (const n of [name, ...aliases]) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  throw new Error(`Missing required env: ${name}`);
}

/**
 * Supabase client authenticated as the dashboard user (RLS uses auth.uid()).
 *
 * Prefer `SUPABASE_ACCESS_TOKEN` when the wiki job injected a fresh access JWT
 * (safe across many `tsx` script invocations). Otherwise falls back to
 * `SUPABASE_REFRESH_TOKEN` + `refreshSession` — that rotates the refresh token,
 * so it must not be called once per script with the same env token.
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
  if (access) {
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

  const refresh = env("SUPABASE_REFRESH_TOKEN");
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
