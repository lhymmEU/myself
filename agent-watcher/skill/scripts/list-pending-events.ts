/**
 * Print pending events for this user as a JSON array, oldest first.
 * Used by the agent at the start of an ingest cycle to plan its work.
 *
 * Each row includes the event_type and either a `payload` (inline JSON)
 * or a `blob_path` (Storage object key). Use fetch-payload.ts to resolve.
 *
 * Run: npx tsx scripts/list-pending-events.ts
 */

import { getClient } from "./lib/supabase";
import { loadConfig } from "./lib/config";

async function main(): Promise<void> {
  const cfg = await loadConfig();
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("agent_events")
    .select("id, event_type, payload, blob_path, source_ref, created_at")
    .eq("user_id", cfg.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
