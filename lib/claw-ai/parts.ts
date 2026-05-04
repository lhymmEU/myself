/**
 * Typed UIMessage data parts for the Claw chat.
 *
 * These shapes are the contract between:
 *   - the openclaw remote agent (which is taught to emit `[CARD type=...]`
 *     blocks via the system prompt — see `lib/claw-ui/catalog.ts`),
 *   - the streaming proxy at `app/api/claw/dm/route.ts` (which parses
 *     blocks and writes them as AI SDK `data-*` parts),
 *   - and the client renderers under `components/claw/home/parts/`.
 *
 * Add a new card type only after adding a renderer + a prompt example.
 */
import type { InferUIMessageChunk, UIMessage } from "ai";

// ---------------------------------------------------------------------------
// Approval (from openclaw [TOOL_CALL] blocks)
// ---------------------------------------------------------------------------

export interface ApprovalArgs {
  [key: string]: unknown;
}

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "succeeded"
  | "failed";

export interface ApprovalData {
  /** Stable id for stream reconciliation when the status mutates. */
  id: string;
  /** Tool registry name, e.g. `plans.list`, `marked.search`. */
  tool: string;
  /** One-sentence plain-language description of what we're about to do. */
  summary: string;
  args: ApprovalArgs;
  status?: ApprovalStatus;
  /** Filled in when status flips to succeeded/failed. */
  result?: string;
}

// ---------------------------------------------------------------------------
// Status (Claw is online / working / sleeping)
// ---------------------------------------------------------------------------

export interface StatusData {
  state: "online" | "working" | "sleeping" | "offline";
  /** ISO timestamp of last contact. Optional — when missing, pill renders without subtitle. */
  lastSeen?: string;
  /** Friendly task description when `state === "working"`. */
  task?: string;
}

// ---------------------------------------------------------------------------
// Todos (today / quick context)
// ---------------------------------------------------------------------------

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  /** Optional category tag, e.g. "work", "personal". */
  category?: string;
}

export interface TodosData {
  items: TodoItem[];
  /** Optional friendly heading for the card. */
  title?: string;
}

// ---------------------------------------------------------------------------
// Routines (simplified cron view)
// ---------------------------------------------------------------------------

export interface RoutineItem {
  id: string;
  name: string;
  /** Plain-language cadence, e.g. "Daily at 8:00". */
  cadence: string;
  /** ISO timestamp of next planned run. */
  nextRun?: string;
  enabled: boolean;
}

export interface RoutinesData {
  items: RoutineItem[];
}

// ---------------------------------------------------------------------------
// Memory (things Claw remembers)
// ---------------------------------------------------------------------------

export interface MemoryItem {
  id: string;
  text: string;
  category?: string;
  /** ISO timestamp when remembered. */
  rememberedAt?: string;
}

export interface MemoryData {
  items: MemoryItem[];
  /** Optional total count when items are paginated. */
  total?: number;
}

// ---------------------------------------------------------------------------
// Abilities (installed skills)
// ---------------------------------------------------------------------------

export interface AbilityItem {
  slug: string;
  name: string;
  description?: string;
  installed?: boolean;
}

export interface AbilitiesData {
  items: AbilityItem[];
}

// ---------------------------------------------------------------------------
// Generative form (model-filled, user-confirmed)
// ---------------------------------------------------------------------------

export type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "time"
  | "days"
  | "number";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  /** Initial value pre-filled by the agent. */
  value?: unknown;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface FormData {
  id: string;
  /** What this form will do when submitted. Keep extending the union as new flows land. */
  intent: "schedule-routine" | "save-memory";
  fields: FormField[];
  submitLabel: string;
  /** Optional explanatory blurb above the form. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Error (friendly, retryable)
// ---------------------------------------------------------------------------

export interface ErrorData {
  message: string;
  retryable?: boolean;
  /** Internal hint — never shown to the user but useful for telemetry. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Legacy json-render fallback
// ---------------------------------------------------------------------------

export interface UISpecData {
  /** Raw json-render spec — rendered by the legacy fallback component. */
  spec: unknown;
}

// ---------------------------------------------------------------------------
// The full UIMessage type for the Claw chat
// ---------------------------------------------------------------------------

export type ClawDataParts = {
  status: StatusData;
  todos: TodosData;
  routines: RoutinesData;
  memory: MemoryData;
  abilities: AbilitiesData;
  approval: ApprovalData;
  form: FormData;
  error: ErrorData;
  uiSpec: UISpecData;
};

export interface ClawMessageMetadata {
  /** Effective session key after the server resolves stale targets. */
  sessionId?: string;
  /** Effective agentId after the server resolves stale targets. */
  agentId?: string;
  /** True when the server transparently retried with a fresh agent. */
  retriedWithFreshAgent?: boolean;
  /** True when the agent set on the remote shifted under us. */
  agentsChanged?: boolean;
}

export type ClawUIMessage = UIMessage<ClawMessageMetadata, ClawDataParts>;

/** Typed chunk that the server-side stream writer can emit. */
export type ClawUIMessageChunk = InferUIMessageChunk<ClawUIMessage>;

// ---------------------------------------------------------------------------
// Card type registry (server parser + prompt builder both consume this)
// ---------------------------------------------------------------------------

export type ClawCardType = keyof ClawDataParts;

/**
 * Ordered list of card types we expose to openclaw via the system prompt.
 * Keep in sync with the renderer registry in `components/claw/home/parts/`.
 */
export const CLAW_CARD_TYPES: ClawCardType[] = [
  "status",
  "todos",
  "routines",
  "memory",
  "abilities",
  "approval",
  "form",
  "error",
];
