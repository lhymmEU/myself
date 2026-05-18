/**
 * Write an expanded plan back to a user_wishes row.
 *
 * Run:
 *   echo '{"step_1":"…","step_2":"…"}' | npx tsx scripts/save-wish-plan.ts <wishId>
 *
 *   # Or, to mark a wish as failed without touching plan_data:
 *   npx tsx scripts/save-wish-plan.ts <wishId> --error
 */

import { getClient } from "./lib/supabase";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const wishId = process.argv[2];
  const errorFlag = process.argv.includes("--error");
  if (!wishId) {
    console.error(
      "Usage: save-wish-plan.ts <wishId> [--error]   (plan JSON on stdin)",
    );
    process.exit(2);
  }

  const supabase = await getClient();

  if (errorFlag) {
    const { error } = await supabase
      .from("user_wishes")
      .update({ status: "error", updated_at: Date.now() })
      .eq("id", wishId);
    if (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
    process.stdout.write(JSON.stringify({ ok: true, status: "error" }) + "\n");
    return;
  }

  const raw = (await readStdin()).trim();
  if (!raw) {
    console.error("save-wish-plan.ts: empty stdin (expected JSON plan)");
    process.exit(2);
  }
  let plan: unknown;
  try {
    plan = JSON.parse(raw);
  } catch (err) {
    console.error(
      `save-wish-plan.ts: invalid JSON on stdin — ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    console.error("save-wish-plan.ts: plan must be a flat JSON object");
    process.exit(2);
  }

  const { error } = await supabase
    .from("user_wishes")
    .update({
      plan_data: JSON.stringify(plan),
      status: "ready",
      updated_at: Date.now(),
    })
    .eq("id", wishId);
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true, status: "ready" }) + "\n");
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
