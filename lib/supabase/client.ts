/**
 * Browser-side Supabase client.
 *
 * Used in client components (anything with "use client") and never on the
 * server. `createBrowserClient` already memoises a singleton internally, so
 * calling this on every render is safe and cheap.
 *
 * In local mode this file is still importable but the caller should never
 * actually invoke it — `isCloud()` should gate every use site.
 */

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
