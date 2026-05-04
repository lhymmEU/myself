/**
 * Parses raw `openclaw agent --json` output into an ordered sequence of
 * UIMessage chunks. The parser is the bridge between openclaw's loose
 * "tags inside JSON" output and the AI SDK's typed `data-*` parts that
 * the client renders.
 *
 * Block grammar (openclaw is taught these by the system prompt):
 *
 *   [CARD type=<typeName>] {json} [/CARD]   → typed data part
 *   [TOOL_CALL] {json} [/TOOL_CALL]         → data-approval part
 *   [UI_SPEC] {json} [/UI_SPEC]             → typed data part if shape matches
 *                                             a known card, else legacy fallback
 *
 * Anything outside those blocks is plain text.
 */
import { nanoid } from "nanoid";
import type {
  AbilitiesData,
  ApprovalArgs,
  ApprovalData,
  ClawCardType,
  ErrorData,
  FormData,
  MemoryData,
  RoutinesData,
  StatusData,
  TodosData,
  UISpecData,
} from "./parts";
import { CLAW_CARD_TYPES } from "./parts";

// ---------------------------------------------------------------------------
// Token grammar
// ---------------------------------------------------------------------------

const CARD_REGEX = /\[CARD\s+type=([a-zA-Z]+)\]\s*([\s\S]*?)\s*\[\/CARD\]/g;
const TOOL_CALL_REGEX = /\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/g;
const UI_SPEC_REGEX = /\[UI_SPEC\]\s*([\s\S]*?)\s*\[\/UI_SPEC\]/g;

// ---------------------------------------------------------------------------
// Typed parsed fragment
// ---------------------------------------------------------------------------

export type ParsedFragment =
  | { kind: "text"; text: string }
  | { kind: "card"; type: "status"; id: string; data: StatusData }
  | { kind: "card"; type: "todos"; id: string; data: TodosData }
  | { kind: "card"; type: "routines"; id: string; data: RoutinesData }
  | { kind: "card"; type: "memory"; id: string; data: MemoryData }
  | { kind: "card"; type: "abilities"; id: string; data: AbilitiesData }
  | { kind: "card"; type: "approval"; id: string; data: ApprovalData }
  | { kind: "card"; type: "form"; id: string; data: FormData }
  | { kind: "card"; type: "error"; id: string; data: ErrorData }
  | { kind: "card"; type: "uiSpec"; id: string; data: UISpecData };

// ---------------------------------------------------------------------------
// Top-level helpers — extracted from the legacy /api/claw/dm route so they
// can be unit-tested in isolation.
// ---------------------------------------------------------------------------

/**
 * Pull the agent text + sessionId out of an `openclaw agent --json`
 * stdout blob. Falls back to the raw string when the output isn't JSON.
 */
export function extractAgentText(raw: string): {
  text: string;
  sessionId?: string;
} {
  let agentText = raw;
  let sessionId: string | undefined;

  try {
    const parsed = JSON.parse(raw);
    sessionId =
      parsed.sessionId ??
      parsed.session_id ??
      parsed.result?.sessionId ??
      undefined;

    agentText =
      parsed.result?.payloads?.[0]?.text ??
      parsed.response ??
      parsed.content ??
      parsed.text ??
      parsed.message ??
      parsed.choices?.[0]?.message?.content ??
      parsed.output ??
      raw;
  } catch {
    // Not JSON — keep raw text
  }

  return { text: agentText.trim(), sessionId };
}

/**
 * Detects the "agent doesn't exist anymore" class of openclaw failures —
 * the symptom of a remote re-init while the client still holds a
 * cached agentId/sessionId.
 */
export function isStaleTargetError(stderr: string, stdout: string): boolean {
  const blob = `${stderr}\n${stdout}`.toLowerCase();
  if (!blob.trim()) return false;
  return (
    /\bagent\b[^\n]*\b(not\s+found|unknown|invalid|missing|does\s+not\s+exist)\b/.test(
      blob,
    ) ||
    /\bno\s+such\s+(agent|session)\b/.test(blob) ||
    /\bsession\b[^\n]*\b(not\s+found|unknown|invalid|missing|does\s+not\s+exist|expired)\b/.test(
      blob,
    ) ||
    /\bunknown\s+agent\b/.test(blob)
  );
}

// ---------------------------------------------------------------------------
// Block-by-block tokenisation
// ---------------------------------------------------------------------------

interface RawMatch {
  start: number;
  end: number;
  fragment: ParsedFragment;
}

function tryParseJson(json: string): unknown | null {
  try {
    return JSON.parse(json.trim());
  } catch {
    return null;
  }
}

function isKnownCardType(value: string): value is ClawCardType {
  return (CLAW_CARD_TYPES as readonly string[]).includes(value) ||
    value === "uiSpec";
}

function buildCardFragment(
  type: string,
  parsed: unknown,
): ParsedFragment | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (!isKnownCardType(type)) return null;

  const id =
    (parsed as { id?: unknown }).id &&
    typeof (parsed as { id?: unknown }).id === "string"
      ? ((parsed as { id: string }).id)
      : `${type}-${nanoid()}`;

  // Trust the agent's shape — the openclaw prompt teaches the schema and
  // bad payloads simply won't render usefully on the client. This keeps
  // the parser cheap; we don't want to drop a card just because a field
  // is missing.
  switch (type) {
    case "status":
      return { kind: "card", type, id, data: parsed as StatusData };
    case "todos":
      return { kind: "card", type, id, data: parsed as TodosData };
    case "routines":
      return { kind: "card", type, id, data: parsed as RoutinesData };
    case "memory":
      return { kind: "card", type, id, data: parsed as MemoryData };
    case "abilities":
      return { kind: "card", type, id, data: parsed as AbilitiesData };
    case "approval":
      return {
        kind: "card",
        type,
        id,
        data: { ...(parsed as ApprovalData), id },
      };
    case "form":
      return {
        kind: "card",
        type,
        id,
        data: { ...(parsed as FormData), id },
      };
    case "error":
      return { kind: "card", type, id, data: parsed as ErrorData };
    case "uiSpec":
      return {
        kind: "card",
        type,
        id,
        data: { spec: parsed } as UISpecData,
      };
    default:
      return null;
  }
}

function buildApprovalFromToolCall(parsed: unknown): ParsedFragment | null {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { name?: unknown }).name !== "string"
  ) {
    return null;
  }
  const tool = (parsed as { name: string }).name;
  const args =
    (parsed as { arguments?: ApprovalArgs }).arguments ??
    (parsed as { args?: ApprovalArgs }).args ??
    {};
  const summary =
    (parsed as { summary?: string }).summary ??
    `Run ${tool}`;
  const id = `approval-${nanoid()}`;
  return {
    kind: "card",
    type: "approval",
    id,
    data: { id, tool, summary, args, status: "pending" },
  };
}

/**
 * If a `[UI_SPEC]` block contains a recognised typed shape (e.g. a status
 * panel), prefer the typed card over the legacy json-render fallback.
 * Anything else falls back to `data-uiSpec` so the legacy renderer
 * picks it up.
 */
function buildFromUISpec(parsed: unknown): ParsedFragment | null {
  if (!parsed || typeof parsed !== "object") return null;

  const candidate = parsed as Record<string, unknown>;

  // json-render specs always have `root` + `elements`. If neither key
  // is present the spec is malformed — drop it.
  if (!("root" in candidate) || !("elements" in candidate)) return null;

  return {
    kind: "card",
    type: "uiSpec",
    id: `uispec-${nanoid()}`,
    data: { spec: candidate } as UISpecData,
  };
}

/**
 * Walk a raw agent string and return the ordered list of fragments
 * (text + cards) it contains. Fragments are emitted in the same order
 * they appear in the source so downstream code can stream them with
 * the same ordering the user would naturally read.
 */
export function tokeniseAgentOutput(raw: string): ParsedFragment[] {
  const fragments: ParsedFragment[] = [];
  const matches: RawMatch[] = [];

  const each = (regex: RegExp, build: (m: RegExpExecArray) => ParsedFragment | null) => {
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(raw))) {
      const fragment = build(m);
      if (fragment) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          fragment,
        });
      }
    }
  };

  each(CARD_REGEX, (m) => {
    const type = m[1];
    const parsed = tryParseJson(m[2]);
    return parsed ? buildCardFragment(type, parsed) : null;
  });

  each(TOOL_CALL_REGEX, (m) => {
    const parsed = tryParseJson(m[1]);
    return parsed ? buildApprovalFromToolCall(parsed) : null;
  });

  each(UI_SPEC_REGEX, (m) => {
    const parsed = tryParseJson(m[1]);
    return parsed ? buildFromUISpec(parsed) : null;
  });

  matches.sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      const text = raw.slice(cursor, m.start).trim();
      if (text) fragments.push({ kind: "text", text });
    }
    fragments.push(m.fragment);
    cursor = m.end;
  }

  if (cursor < raw.length) {
    const trailing = raw.slice(cursor).trim();
    if (trailing) fragments.push({ kind: "text", text: trailing });
  }

  // Edge case: the entire response is a bare json-render spec with no
  // tags. Treat the whole string as a single UI_SPEC fragment.
  if (fragments.length === 0) {
    const trimmed = raw.trim();
    if (trimmed) {
      const parsed = tryParseJson(trimmed);
      const ui = parsed ? buildFromUISpec(parsed) : null;
      if (ui) {
        fragments.push(ui);
      } else {
        fragments.push({ kind: "text", text: trimmed });
      }
    }
  }

  return fragments;
}

// ---------------------------------------------------------------------------
// Friendly classification (kept for the legacy JSON shim — phase 5 drops it)
// ---------------------------------------------------------------------------

export function classifyResponse(text: string): string {
  const lower = text.toLowerCase();
  const firstLine = lower.split("\n")[0].trim();
  if (
    /^(error\b|failed\b|fatal\b|exception\b)/.test(firstLine) ||
    /\b(error occurred|operation failed|command failed|connection (refused|failed|lost|timed? ?out))\b/.test(
      lower,
    )
  ) {
    return "error";
  }
  if (/\b(status|running|stopped|healthy|unhealthy|gateway|uptime)\b/.test(lower))
    return "status";
  if (/\b(task|created|started|queued|progress|completed)\b/.test(lower))
    return "task";
  if (/\b(memor|remember|recall|knowledge)\b/.test(lower)) return "memory";
  if (/\b(skill|installed|available|marketplace)\b/.test(lower))
    return "skills";
  return "text";
}
