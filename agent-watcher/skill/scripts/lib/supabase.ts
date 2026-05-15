import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "./config";

let cached: SupabaseClient | null = null;

export async function getClient(): Promise<SupabaseClient> {
  if (cached) return cached;
  const cfg = await loadConfig();
  cached = createClient(cfg.supabaseUrl, cfg.token, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${cfg.token}` } },
  });
  return cached;
}
