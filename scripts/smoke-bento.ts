/**
 * Smoke test for the bento dashboard against Supabase Postgres.
 *
 * Requires: DATABASE_URL, NEXT_PUBLIC_SUPABASE_* (for boot if needed),
 * and MYSELF_SMOKE_USER_ID (a real auth.users uuid with rows permission).
 *
 * Run: `MYSELF_SMOKE_USER_ID=<uuid> tsx scripts/smoke-bento.ts`
 */
import {
  publishDashboard,
  listActiveCards,
  recordVerb,
} from "../lib/modules/dashboard/insights-actions";

function requireSmokeUser(): string {
  const id = process.env.MYSELF_SMOKE_USER_ID?.trim();
  if (!id) {
    throw new Error("Set MYSELF_SMOKE_USER_ID to a Supabase auth user uuid.");
  }
  return id;
}

async function main() {
  const userId = requireSmokeUser();

  await publishDashboard(
    [
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
    ],
    userId,
  );
  console.log("[2/4] publishDashboard ok");

  const cards = await listActiveCards(userId);
  if (cards.length < 2) {
    throw new Error(`expected 2+ active cards, got ${cards.length}`);
  }
  console.log(`[3/4] listActiveCards returned ${cards.length} card(s)`);

  await recordVerb("smoke-card-1", "archive", null, userId);
  const afterArchive = await listActiveCards(userId);
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
