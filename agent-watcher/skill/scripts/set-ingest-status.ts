/**
 * Update wiki_ingest_state.status / detail without touching the cards.
 * Useful for telling the dashboard "I'm working on it" and "I'm done."
 *
 * Run:
 *   npx tsx scripts/set-ingest-status.ts processing "wiki ingest starting"
 *   npx tsx scripts/set-ingest-status.ts done ""
 *   npx tsx scripts/set-ingest-status.ts error "regen-cards.ts crashed: ..."
 */

import { getClient } from "./lib/supabase";
import { loadConfig } from "./lib/config";

const VALID = new Set(["idle", "processing", "done", "error"]);

async function main(): Promise<void> {
  const status = process.argv[2];
  const detail = process.argv[3] ?? "";
  if (!status || !VALID.has(status)) {
    console.error("Usage: set-ingest-status.ts <idle|processing|done|error> [detail]");
    process.exit(2);
  }
  const cfg = await loadConfig();
  const supabase = await getClient();
  const { error } = await supabase
    .from("wiki_ingest_state")
    .upsert(
      { user_id: cfg.userId, status, detail, updated_at: Date.now() },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true, status, detail }) + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
