import type { WishCategory } from "@/lib/wishlist/types";

export const WISH_PLAN_JSON_START = "<<<WISH_PLAN_JSON_START>>>";
export const WISH_PLAN_JSON_END = "<<<WISH_PLAN_JSON_END>>>";

const CATEGORY_LABEL: Record<WishCategory, string> = {
  learn: "something to learn",
  place: "a place to go",
  goal: "a goal to achieve",
};

/**
 * Prepended to the user message for one-shot wish plan generation over Claw.
 * The agent must print a single JSON object with only string values between
 * the markers (machine-parseable); prose outside markers is optional.
 */
export function buildWishlistPlanPreamble(category: WishCategory): string {
  const label = CATEGORY_LABEL[category];
  return [
    "[CHANNEL=wishlist-plan]",
    `The user is recording a wish in the category: ${category} (${label}).`,
    "Your job is to produce a practical plan that helps them move toward this wish.",
    "",
    "## Output contract (mandatory)",
    `After any brief reasoning, print EXACTLY one JSON object between these two lines (and nothing between the markers except the JSON):`,
    WISH_PLAN_JSON_START,
    `{ ... }`,
    WISH_PLAN_JSON_END,
    "",
    "## JSON shape",
    "- The JSON must be a flat object: every key maps to a string value (no nested objects or arrays).",
    "- Use snake_case keys.",
    "- Always include:",
    `  - "title": short title for the wish (string).`,
    `  - "summary": 2-4 sentences overview (string).`,
    "- Include ordered steps as:",
    `  - "step_1", "step_2", ... "step_10" — each value is one actionable step (string). Use as many as useful (at least 2, at most 10).`,
    "- Optional extra string keys are encouraged (resources, risks, timeline_hint, etc.).",
    "",
    "## Step completion hints (for the app UI)",
    "The host may track progress with keys done_step_1, done_step_2, ... each string \"true\" or \"false\". Omit them initially (the app defaults to false).",
    "",
    "User's description of their wish follows below.",
    "---",
  ].join("\n");
}

export function extractWishPlanJson(stdout: string): Record<string, string> | null {
  const start = stdout.indexOf(WISH_PLAN_JSON_START);
  const end = stdout.indexOf(WISH_PLAN_JSON_END);
  if (start === -1 || end === -1 || end <= start) return null;
  const inner = stdout
    .slice(start + WISH_PLAN_JSON_START.length, end)
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(inner);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") {
      out[k] = v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    } else {
      // reject nested structures per contract
      return null;
    }
  }
  return out;
}
