/**
 * Centralised env-var lookups for Supabase.
 *
 * All Supabase client factories MUST go through these helpers so we get
 * one consistent error message when a deployment forgets to set them, and
 * so we can swap in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` later without
 * touching every call site.
 */

export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  if (!url) {
    throw new Error(
      "Supabase URL not configured. Set NEXT_PUBLIC_SUPABASE_URL " +
        "(cloud deploys only — local mode never reaches this code).",
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";
  if (!key) {
    throw new Error(
      "Supabase anon/publishable key not configured. Set " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
        "for cloud deploys.",
    );
  }
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not configured. Required only for " +
        "server-side admin operations (e.g. minting JWTs for the claw relay).",
    );
  }
  return key;
}
