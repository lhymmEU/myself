import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createUserSupabase } from "./lib/user-client";

const CARD_LIMIT = 9;
const DASHBOARD_CARD_SLOT_RE = /^[a-z0-9_]{1,48}$/;

function resolveDashboardCardId(
  userId: string,
  c: Record<string, unknown>,
): string {
  const explicit = typeof c.id === "string" ? c.id.trim() : "";
  if (explicit) return explicit;
  const slot = typeof c.slot === "string" ? c.slot.trim() : "";
  if (slot && DASHBOARD_CARD_SLOT_RE.test(slot)) {
    return `${userId}_dash_${slot}`;
  }
  return newCardId();
}

const path = process.argv[2];
if (!path) {
  console.error(
    "Usage: … tsx publish-dashboard.ts <path-to-json>  # file: { \"cards\": [ ... ] }",
  );
  process.exit(1);
}

const raw = await readFile(path, "utf8");
let parsed: { cards?: unknown[] };
try {
  parsed = JSON.parse(raw) as { cards?: unknown[] };
} catch {
  console.error("Invalid JSON");
  process.exit(1);
}
const cards = Array.isArray(parsed.cards) ? parsed.cards.slice(0, CARD_LIMIT) : [];
if (cards.length === 0) {
  console.log(JSON.stringify({ count: 0, note: "empty publish skipped" }));
  process.exit(0);
}

const supabase = await createUserSupabase();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user?.id) {
  console.error("No user on session");
  process.exit(1);
}
const userId = user.id;
const now = Date.now();

const incomingIds = new Set<string>();

for (const c of cards as Record<string, unknown>[]) {
  const id = resolveDashboardCardId(userId, c);
  incomingIds.add(id);
  const row = {
    id,
    user_id: userId,
    kind: String(c.kind ?? "synthesis"),
    title: String(c.title ?? ""),
    body: String(c.body ?? ""),
    hue: Number(c.hue ?? 210),
    freshness: Number(c.freshness ?? now),
    confidence: String(c.confidence ?? "thin"),
    sources_json: JSON.stringify(c.sources ?? []),
    wiki_slug: c.wikiSlug != null ? String(c.wikiSlug) : null,
    pinned_goal_id: c.pinnedGoalId != null ? String(c.pinnedGoalId) : null,
    priority: Number(c.priority ?? 0),
    state: "active",
    created_at: now,
    updated_at: now,
  };

  const { data: existing } = await supabase
    .from("dashboard_cards")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("dashboard_cards")
      .update({
        kind: row.kind,
        title: row.title,
        body: row.body,
        hue: row.hue,
        freshness: row.freshness,
        confidence: row.confidence,
        sources_json: row.sources_json,
        wiki_slug: row.wiki_slug,
        pinned_goal_id: row.pinned_goal_id,
        priority: row.priority,
        state: "active",
        updated_at: now,
      })
      .eq("id", id);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  } else {
    const { error } = await supabase.from("dashboard_cards").insert(row);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
}

const { data: stale, error: selErr } = await supabase
  .from("dashboard_cards")
  .select("id")
  .eq("state", "active");
if (selErr) {
  console.error(selErr.message);
  process.exit(1);
}
for (const r of stale ?? []) {
  const sid = r.id as string;
  if (!incomingIds.has(sid)) {
    const { error } = await supabase
      .from("dashboard_cards")
      .update({ state: "archived", updated_at: now })
      .eq("id", sid);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
}

console.log(JSON.stringify({ count: cards.length }));

function newCardId(): string {
  return randomBytes(12).toString("base64url");
}
