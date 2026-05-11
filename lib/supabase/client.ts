/**
 * Browser-side Supabase client.
 *
 * Used in client components (anything with "use client") and never on the
 * server. `createBrowserClient` already memoises a singleton internally, so
 * calling this on every render is safe and cheap.
 *
 */

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
