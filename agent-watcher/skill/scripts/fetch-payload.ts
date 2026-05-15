/**
 * Resolve the payload for a single event and print it to stdout as JSON.
 * - If `payload` is set on the row, return it directly.
 * - Otherwise download the blob at `blob_path` from agent-event-blobs.
 *
 * Run: npx tsx scripts/fetch-payload.ts <event-id>
 */

import { getClient } from "./lib/supabase";
import { loadConfig } from "./lib/config";

async function main(): Promise<void> {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error("Usage: fetch-payload.ts <event-id>");
    process.exit(2);
  }
  const cfg = await loadConfig();
  const supabase = await getClient();
  const { data: row, error } = await supabase
    .from("agent_events")
    .select("payload, blob_path")
    .eq("user_id", cfg.userId)
    .eq("id", eventId)
    .single();
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  if (row.payload !== null && row.payload !== undefined) {
    process.stdout.write(JSON.stringify(row.payload, null, 2) + "\n");
    return;
  }
  if (!row.blob_path) {
    console.error(JSON.stringify({ error: "event has neither payload nor blob_path" }));
    process.exit(1);
  }
  const { data: blob, error: dlErr } = await supabase.storage
    .from("agent-event-blobs")
    .download(row.blob_path);
  if (dlErr || !blob) {
    console.error(JSON.stringify({ error: dlErr?.message ?? "blob download failed" }));
    process.exit(1);
  }
  const text = await blob.text();
  process.stdout.write(text + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
