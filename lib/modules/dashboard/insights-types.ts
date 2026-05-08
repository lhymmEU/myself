import type {
  CardKind,
  CardConfidence,
  CardState,
  CardVerb,
} from "@/lib/db/schema/sqlite/insights";

export type { CardKind, CardConfidence, CardState, CardVerb };

export interface SourceRef {
  kind: "plan" | "marked" | "wish" | "skill";
  id: string;
  /** Optional `start:end` line range or anchor for plan/marked sources. */
  range?: string;
  /** Display label rendered in the slide-in chip. */
  label?: string;
}

export interface DashboardCard {
  id: string;
  kind: CardKind;
  title: string;
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
  kind: CardKind;
  title: string;
  body?: string;
  hue?: number;
  freshness?: number;
  confidence?: CardConfidence;
  sources?: SourceRef[];
  wikiSlug?: string | null;
  pinnedGoalId?: string | null;
  priority?: number;
}
