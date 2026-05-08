/**
 * Shared visual helpers: hue mapping, freshness decay, confidence dots.
 * Pure functions only — no React, no DOM access.
 */
import type {
  CardConfidence,
  CardKind,
} from "@/lib/modules/dashboard/insights-types";

/**
 * Stable hue (0..360) derived from any goal id. Cards inherit this so the
 * bento becomes a colour-coded map of "where my mind is."
 */
export function hueForGoal(goalId: string | null | undefined): number {
  if (!goalId) return 210; // neutral blue when ungrouped
  let h = 0;
  for (let i = 0; i < goalId.length; i++) {
    h = (h * 31 + goalId.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/**
 * Translate a freshness epoch (ms) into a decay value in [0..1].
 * 1 = brand new (today), 0 = stale (older than `maxDays`).
 */
export function freshnessDecay(
  freshness: number,
  maxDays: number = 14,
  now: number = Date.now(),
): number {
  if (!freshness) return 0;
  const ageMs = Math.max(0, now - freshness);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= maxDays) return 0;
  // Smooth tail-off rather than linear so newly-published cards stay vibrant
  // for a couple of days before fading.
  return Math.max(0, 1 - Math.pow(ageDays / maxDays, 1.5));
}

export function confidenceLabel(c: CardConfidence): string {
  switch (c) {
    case "strong":
      return "Strong";
    case "thin":
      return "Thin";
    case "contradicted":
      return "Contradicted";
    default:
      return "Unknown";
  }
}

export function kindLabel(k: CardKind): string {
  switch (k) {
    case "synthesis":
      return "Synthesis";
    case "lint":
      return "Lint";
    case "gap":
      return "Gap";
    case "query":
      return "Query";
    case "heartbeat":
      return "Heartbeat";
    default:
      return "Card";
  }
}

/**
 * Tile-spans for the bento grid by card kind. Keeps the layout interesting
 * while letting CSS auto-flow handle reflow.
 */
export function bentoSpan(kind: CardKind): {
  col: 1 | 2 | 3;
  row: 1 | 2;
} {
  switch (kind) {
    case "synthesis":
      return { col: 2, row: 2 };
    case "heartbeat":
      return { col: 2, row: 1 };
    case "lint":
      return { col: 1, row: 1 };
    case "gap":
      return { col: 1, row: 1 };
    case "query":
      return { col: 1, row: 2 };
    default:
      return { col: 1, row: 1 };
  }
}
