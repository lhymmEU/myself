/**
 * Publish a regenerated set of dashboard cards.
 *
 * Reads the JSON from stdin (or from --file <path>) and writes it to
 * wiki_ingest_state.generative_cards_json for this user. The dashboard's
 * frontend subscribes to that row via Realtime and rerenders immediately.
 *
 * Expected shape:
 *   { "cards": [<DashboardCard>, <DashboardCard>, ...] }
 *
 * Run:
 *   cat cards.json | npx tsx scripts/publish-cards.ts
 *   npx tsx scripts/publish-cards.ts --file cards.json
 */

import { promises as fs } from "node:fs";
import { getClient } from "./lib/supabase";
import { loadConfig } from "./lib/config";

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  let json: string;
  const fileFlagIdx = process.argv.indexOf("--file");
  if (fileFlagIdx >= 0 && process.argv[fileFlagIdx + 1]) {
    json = await fs.readFile(process.argv[fileFlagIdx + 1], "utf8");
  } else {
    json = await readAll(process.stdin);
  }
  if (!json.trim()) {
    console.error("publish-cards.ts: no input received");
    process.exit(2);
  }
  // Validate it parses, but write the original string (preserves formatting).
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray((parsed as { cards?: unknown[] }).cards)) {
      throw new Error("payload must be { cards: [...] }");
    }
  } catch (err) {
    console.error(`publish-cards.ts: invalid JSON: ${String(err)}`);
    process.exit(2);
  }

  const cfg = await loadConfig();
  const supabase = await getClient();
  const now = Date.now();
  const { error } = await supabase
    .from("wiki_ingest_state")
    .upsert(
      {
        user_id: cfg.userId,
        status: "done",
        detail: "",
        generative_cards_json: json,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true, updated_at: now }) + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
