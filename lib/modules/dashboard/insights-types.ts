import type {
  CardKind,
  CardConfidence,
  CardState,
  CardVerb,
} from "@/lib/db/schema/postgres/insights";

export type { CardKind, CardConfidence, CardState, CardVerb };

export interface SourceRef {
  kind: "plan" | "marked" | "wish" | "skill";
  id: string;
  /** Optional `start:end` line range or anchor for plan/marked sources. */
  range?: string;
  /** Display label rendered in the slide-in chip. */
  label?: string;
}

export type GenerativeBlock =
  | { t: "heading"; text: string }
  | { t: "paragraph"; text: string }
  | { t: "bullets"; items: string[] }
  | { t: "callout"; tone: "info" | "warn" | "success"; text: string }
  | { t: "metric"; label: string; value: string };

export interface GenerativePresentation {
  blocks: GenerativeBlock[];
}

export interface DashboardCard {
  id: string;
  /**
   * When the card id was derived from wiki ingest `slot` (`${userId}_dash_${slot}`),
   * the slot name for layout and ordering. Otherwise null.
   */
  ingestSlot: string | null;
  kind: CardKind;
  title: string;
  /**
   * Short plain-text summary (≤ 2 sentences) rendered on the bento tile.
   * Acts as the "headline" the user sees before clicking. Optional — when
   * absent, the tile falls back to a clamped view of `body`/`presentation`.
   */
  summary: string | null;
  /** Full detail shown in the slide-in sheet. May be Markdown if `richMarkdown`. */
  body: string;
  hue: number;
  freshness: number;
  confidence: CardConfidence;
  sources: SourceRef[];
  wikiSlug: string | null;
  pinnedGoalId: string | null;
  priority: number;
  state: CardState;
  createdAt: number;
  updatedAt: number;
  /** Optional structured layout parsed from agent card JSON. */
  presentation?: GenerativePresentation | null;
  /** When true, `body` is rendered as Markdown in the bento tile. */
  richMarkdown?: boolean;
}

export interface PinnedQuery {
  id: string;
  question: string;
  wikiSlug: string | null;
  lastAnswerAt: number | null;
  createdAt: number;
}

export interface CardDismissal {
  id: string;
  cardId: string;
  verb: CardVerb;
  payload: Record<string, unknown> | null;
  createdAt: number;
  ingested: boolean;
}

/** Shape openclaw passes to publishDashboard. */
export interface PublishCardInput {
  id?: string;
  /** Stable logical tile; server maps to `${userId}_dash_${slot}` when `id` is omitted. */
  slot?: string;
  kind: CardKind;
  title: string;
  /** ≤ 2 sentence plain-text headline for the bento tile. */
  summary?: string;
  /** Full detail body (Markdown when `richMarkdown` is true). Shown in the slide-in. */
  body?: string;
  hue?: number;
  freshness?: number;
  confidence?: CardConfidence;
  sources?: SourceRef[];
  wikiSlug?: string | null;
  pinnedGoalId?: string | null;
  priority?: number;
  presentation?: GenerativePresentation | null;
  richMarkdown?: boolean;
}
