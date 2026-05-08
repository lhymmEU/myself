/**
 * One-shot smoke for the bento dashboard. Bootstraps the local DB, seeds a
 * demo card via publishDashboard(), then asserts:
 *   1. The wiki vault skeleton was created on disk.
 *   2. The dashboard_cards row was inserted.
 *   3. listActiveCards returns the seed.
 *   4. recordVerb("archive") soft-deletes it.
 * Intended for local sanity checks; not part of automated CI.
 *
 * Run: `tsx scripts/smoke-bento.ts`
 */
import path from "path";
import fs from "fs";
import { initDatabase } from "../lib/core/init-db";
import { ensureVault } from "../lib/modules/dashboard/wiki-vault";
import {
  publishDashboard,
  listActiveCards,
  recordVerb,
} from "../lib/modules/dashboard/insights-actions";

async function main() {
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = "local";
  process.env.DEPLOYMENT_MODE = "local";

  initDatabase();
  const paths = ensureVault();
  if (!paths) throw new Error("vault not initialised");

  const required = [
    paths.agentsMd,
    paths.indexMd,
    paths.logMd,
    paths.entitiesDir,
    paths.synthesesDir,
    paths.queriesDir,
  ];
  for (const p of required) {
    if (!fs.existsSync(p)) throw new Error(`missing vault path: ${p}`);
  }
  console.log(
    `[1/4] vault ok at ${path.relative(process.cwd(), paths.root)}`,
  );

  await publishDashboard([
    {
      id: "smoke-card-1",
      kind: "synthesis",
      title: "Smoke synthesis: Rust >> Go for embedded",
      body: "After 3 sources you favoured Rust toolchain ergonomics. Confidence: thin (only 3 sources).",
      hue: 25,
      freshness: Date.now(),
      confidence: "thin",
      sources: [
        { kind: "marked", id: "demo-md-1", label: "Embedded Rust handbook" },
        { kind: "plan", id: "demo-pl-1", label: "Job hunt plan" },
      ],
      wikiSlug: "syntheses/rust-vs-go-embedded",
      pinnedGoalId: null,
      priority: 50,
    },
    {
      id: "smoke-card-2",
      kind: "heartbeat",
      title: "Today: 0 ingests, 0 lints",
      body: "Wiki idle. Add sources to see something here.",
      hue: 210,
      freshness: Date.now(),
      confidence: "strong",
      sources: [],
      wikiSlug: "syntheses/heartbeat",
      priority: 10,
    },
  ]);
  console.log("[2/4] publishDashboard ok");

  const cards = await listActiveCards();
  if (cards.length < 2) {
    throw new Error(`expected 2+ active cards, got ${cards.length}`);
  }
  console.log(`[3/4] listActiveCards returned ${cards.length} card(s)`);

  await recordVerb("smoke-card-1", "archive", null);
  const afterArchive = await listActiveCards();
  if (afterArchive.find((c) => c.id === "smoke-card-1")) {
    throw new Error("archive verb did not soft-delete");
  }
  console.log(
    `[4/4] archive verb ok (active set now ${afterArchive.length})`,
  );

  console.log("\nbento smoke OK ✓");
}

main().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
