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
 * Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_REFRESH_TOKEN in the environment.
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
  const refresh = env("SUPABASE_REFRESH_TOKEN");

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refresh,
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? "refreshSession failed");
  }
  return supabase;
}
