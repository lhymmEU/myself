/**
 * Mark a single event as done or error.
 *
 * Run:
 *   npx tsx scripts/mark-event.ts <event-id> done
 *   npx tsx scripts/mark-event.ts <event-id> error "message"
 */

import { getClient } from "./lib/supabase";
import { loadConfig } from "./lib/config";

async function main(): Promise<void> {
  const eventId = process.argv[2];
  const status = process.argv[3];
  const message = process.argv[4];
  if (!eventId || !status || (status !== "done" && status !== "error")) {
    console.error("Usage: mark-event.ts <event-id> <done|error> [message]");
    process.exit(2);
  }
  const cfg = await loadConfig();
  const supabase = await getClient();
  const { error } = await supabase
    .from("agent_events")
    .update({
      status,
      processed_at: Date.now(),
      error: status === "error" ? (message ?? "unspecified") : null,
    })
    .eq("user_id", cfg.userId)
    .eq("id", eventId);
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true, id: eventId, status }) + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
