import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  getDefaultConnection,
  resolveAgentId,
} from "@/lib/modules/claw/actions";
import { preflight } from "@/lib/modules/claw/health";
import {
  buildClawContext,
  formatContextForPrompt,
} from "@/app/api/claw/context/route";
import { CLAW_CARD_PROTOCOL_PROMPT } from "@/lib/claw-ui/catalog";
import {
  extractAgentText,
  isStaleTargetError,
  tokeniseAgentOutput,
  type ParsedFragment,
} from "@/lib/claw-ai/parser";
import type { ClawUIMessage } from "@/lib/claw-ai/parts";

// openclaw runs on the user's remote box and we wait for it; allow the
// route handler to stay open for the full agent timeout.
export const maxDuration = 180;

interface DmRequestBody {
  messages?: UIMessage[];
  /** Forwarded by DefaultChatTransport from `body` config. */
  connectionId?: string;
  agentId?: string | null;
  sessionId?: string | null;
  /** Optional friendly name to attach to a brand-new session. */
  initialSessionName?: string;
}

function lastUserText(messages: UIMessage[] | undefined): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = (m.parts ?? [])
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

interface AgentRunArgs {
  connectionId: string;
  enrichedMessage: string;
  agentId: string;
  sessionId: string | null;
}

async function runAgentCommand({
  connectionId,
  enrichedMessage,
  agentId,
  sessionId,
}: AgentRunArgs): Promise<{ stdout: string; stderr: string; code: number }> {
  const b64 = Buffer.from(enrichedMessage).toString("base64");
  let cmd = `MSG=$(echo ${b64} | base64 -d) && openclaw agent --message "$MSG" --json --timeout 120 --agent ${agentId}`;
  if (sessionId) cmd += ` --session-id ${sessionId}`;
  return executeCommand(connectionId, cmd, 130000);
}

/**
 * Server-Sent Events JSON envelope for an unrecoverable error before we've
 * even started the UIMessage stream. Returned with a non-200 status so the
 * client transport raises an `error` instead of treating it as content.
 */
function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Stream a string as `text-start` + `text-delta` chunks for a typing
 * animation feel. openclaw doesn't natively stream so we slice the
 * final text on the server. Slice size is small enough to feel alive
 * without flooding the wire.
 */
async function streamText(
  writer: {
    write: (chunk: import("@/lib/claw-ai/parts").ClawUIMessageChunk) => void;
  },
  text: string,
  chunkSize = 24,
) {
  const id = `text-${nanoid()}`;
  writer.write({ type: "text-start", id });
  for (let i = 0; i < text.length; i += chunkSize) {
    writer.write({
      type: "text-delta",
      id,
      delta: text.slice(i, i + chunkSize),
    });
    // A 0-ms tick yields the event loop so the SSE flush actually goes
    // out chunk-by-chunk instead of being coalesced into a single frame.
    await new Promise((r) => setTimeout(r, 8));
  }
  writer.write({ type: "text-end", id });
}

function writeFragment(
  writer: {
    write: (chunk: import("@/lib/claw-ai/parts").ClawUIMessageChunk) => void;
  },
  fragment: ParsedFragment,
) {
  if (fragment.kind === "text") {
    return streamText(writer, fragment.text);
  }
  // Typed cards stream as a single chunk; reconciliation by id lets the
  // approval card update its `status` field in place when the user
  // approves the action client-side later.
  switch (fragment.type) {
    case "status":
      writer.write({ type: "data-status", id: fragment.id, data: fragment.data });
      break;
    case "todos":
      writer.write({ type: "data-todos", id: fragment.id, data: fragment.data });
      break;
    case "routines":
      writer.write({ type: "data-routines", id: fragment.id, data: fragment.data });
      break;
    case "memory":
      writer.write({ type: "data-memory", id: fragment.id, data: fragment.data });
      break;
    case "abilities":
      writer.write({ type: "data-abilities", id: fragment.id, data: fragment.data });
      break;
    case "approval":
      writer.write({ type: "data-approval", id: fragment.id, data: fragment.data });
      break;
    case "form":
      writer.write({ type: "data-form", id: fragment.id, data: fragment.data });
      break;
    case "error":
      writer.write({ type: "data-error", id: fragment.id, data: fragment.data });
      break;
    case "uiSpec":
      writer.write({ type: "data-uiSpec", id: fragment.id, data: fragment.data });
      break;
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let body: DmRequestBody;
  try {
    body = (await req.json()) as DmRequestBody;
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const message = lastUserText(body.messages);
  if (!message) {
    return errorResponse("Message is required", 400);
  }

  const connectionId =
    body.connectionId ??
    (await getDefaultConnection(auth.userId))?.id ??
    null;
  if (!connectionId) {
    return errorResponse("No connection configured", 400);
  }

  const pre = await preflight(connectionId);
  if (!pre.ok) {
    return errorResponse(
      typeof pre.body.error === "string"
        ? pre.body.error
        : "Connection unavailable",
      pre.status,
      pre.body as unknown as Record<string, unknown>,
    );
  }

  let agentId: string | null =
    typeof body.agentId === "string" && body.agentId ? body.agentId : null;
  let sessionId: string | null =
    typeof body.sessionId === "string" && body.sessionId
      ? body.sessionId
      : null;

  if (!agentId) {
    agentId = await resolveAgentId(connectionId);
    if (!agentId) {
      return errorResponse(
        "No agent available on the remote. Run `openclaw login` or check that openclaw is healthy, then try again.",
        503,
        { agentsChanged: true },
      );
    }
  }

  // Build the prompt: dashboard context (when modules are enabled) +
  // the [CARD type=...] protocol primer + the user's message.
  let enrichedMessage = message;
  try {
    const ctx = await buildClawContext(auth.userId);
    const hasContext = Object.keys(ctx.modules).length > 0;
    if (hasContext || ctx.availableTools.length > 0) {
      enrichedMessage = `${formatContextForPrompt(ctx)}\n\n${enrichedMessage}`;
    }
  } catch {
    // Context injection is best-effort.
  }
  enrichedMessage = `${CLAW_CARD_PROTOCOL_PROMPT}\n\n${enrichedMessage}`;

  const stream = createUIMessageStream<ClawUIMessage>({
    execute: async ({ writer }) => {
      try {
        let result = await runAgentCommand({
          connectionId,
          enrichedMessage,
          agentId: agentId!,
          sessionId,
        });
        let retried = false;

        // Stale agent recovery: re-resolve once with no session.
        if (
          result.code !== 0 &&
          isStaleTargetError(result.stderr, result.stdout)
        ) {
          const fresh = await resolveAgentId(connectionId);
          if (fresh && fresh !== agentId) {
            agentId = fresh;
            sessionId = null;
            retried = true;
            result = await runAgentCommand({
              connectionId,
              enrichedMessage,
              agentId: fresh,
              sessionId: null,
            });
          }
        }

        if (result.code !== 0) {
          const detail = (result.stderr || result.stdout || "").trim();
          const stale = isStaleTargetError(result.stderr, result.stdout);
          writer.write({
            type: "data-error",
            id: `error-${nanoid()}`,
            data: {
              message:
                "Claw couldn't complete that just now. Try again in a moment.",
              detail: detail.slice(0, 500),
              retryable: true,
            },
          });
          writer.write({
            type: "message-metadata",
            messageMetadata: {
              agentId: agentId ?? undefined,
              ...(stale ? { agentsChanged: true } : {}),
            },
          });
          return;
        }

        const raw = result.stdout.trim();
        if (!raw) {
          writer.write({
            type: "data-error",
            id: `error-${nanoid()}`,
            data: {
              message: "Claw returned an empty response. Please try again.",
              retryable: true,
            },
          });
          return;
        }

        const extracted = extractAgentText(raw);
        const fragments = tokeniseAgentOutput(extracted.text);

        const effectiveSessionId =
          extracted.sessionId ?? sessionId ?? undefined;

        // Surface effective session/agent ids as message metadata so the
        // client can rebind a stale target without manual probing.
        writer.write({
          type: "message-metadata",
          messageMetadata: {
            sessionId: effectiveSessionId,
            agentId: agentId ?? undefined,
            ...(retried ? { retriedWithFreshAgent: true } : {}),
          },
        });

        if (fragments.length === 0) {
          // Defensive: fall back to plain text when the parser produced
          // nothing (very unusual — most runs have at least raw text).
          await streamText(writer, extracted.text || "(no response)");
          return;
        }

        for (const fragment of fragments) {
          await writeFragment(writer, fragment);
        }
      } catch (err) {
        writer.write({
          type: "data-error",
          id: `error-${nanoid()}`,
          data: {
            message: "Something went wrong reaching Claw.",
            detail: err instanceof Error ? err.message : String(err),
            retryable: true,
          },
        });
      }
    },
    onError: (err) =>
      err instanceof Error ? err.message : "Unknown stream error",
  });

  return createUIMessageStreamResponse({ stream });
}
