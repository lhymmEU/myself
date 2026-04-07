import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import {
  buildClawContext,
  formatContextForPrompt,
} from "@/app/api/claw/context/route";

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

function classifyResponse(text: string): string {
  const lower = text.toLowerCase();
  const firstLine = lower.split("\n")[0].trim();

  // Only classify as error when the response itself IS an error, not when it
  // merely discusses errors (e.g. "error handling", "error boundaries").
  if (
    /^(error\b|failed\b|fatal\b|exception\b)/.test(firstLine) ||
    /\b(error occurred|operation failed|command failed|connection (refused|failed|lost|timed? ?out))\b/.test(lower)
  ) {
    return "error";
  }

  if (/\b(status|running|stopped|healthy|unhealthy|gateway|uptime)\b/.test(lower)) return "status";
  if (/\b(task|created|started|queued|progress|completed)\b/.test(lower)) return "task";
  if (/\b(memor|remember|recall|knowledge)\b/.test(lower)) return "memory";
  if (/\b(skill|installed|available|marketplace)\b/.test(lower)) return "skills";
  return "text";
}

function extractAgentText(raw: string): { text: string; sessionId?: string } {
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
    // Not JSON — use raw text
  }

  return { text: agentText.trim(), sessionId };
}

const TOOL_CALL_REGEX = /\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/g;

function extractToolCalls(text: string): {
  cleanText: string;
  toolCalls: ToolCallRequest[];
} {
  const toolCalls: ToolCallRequest[] = [];
  const cleanText = text.replace(TOOL_CALL_REGEX, (_, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed.name && typeof parsed.name === "string") {
        toolCalls.push({
          name: parsed.name,
          arguments: parsed.arguments ?? {},
        });
      }
    } catch {
      // Malformed tool call block — leave it in the text
      return _;
    }
    return "";
  }).trim();

  return { cleanText, toolCalls };
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const connectionId =
      body.connectionId ?? getDefaultConnection()?.id ?? null;

    if (!connectionId) {
      return NextResponse.json(
        { error: "No connection configured" },
        { status: 400 },
      );
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json(
        { error: "Not connected via SSH" },
        { status: 400 },
      );
    }

    const { message, agentId, sessionId } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }
    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 },
      );
    }

    let enrichedMessage = message;
    try {
      const ctx = await buildClawContext();
      const hasContext = Object.keys(ctx.modules).length > 0;
      if (hasContext || ctx.availableTools.length > 0) {
        const contextBlock = formatContextForPrompt(ctx);
        enrichedMessage = `${contextBlock}\n\n${message}`;
      }
    } catch {
      // Context injection is best-effort; proceed with the original message
    }

    const b64 = Buffer.from(enrichedMessage).toString("base64");

    let cmd = `MSG=$(echo ${b64} | base64 -d) && openclaw agent --message "$MSG" --json --timeout 120 --agent ${agentId}`;
    if (sessionId) {
      cmd += ` --session-id ${sessionId}`;
    }

    const result = await executeCommand(connectionId, cmd, 130000);

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      return NextResponse.json(
        {
          error: `Agent command failed (exit ${result.code}): ${detail.slice(0, 500)}`,
        },
        { status: 502 },
      );
    }

    const raw = result.stdout.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from agent" },
        { status: 502 },
      );
    }

    const extracted = extractAgentText(raw);
    const { cleanText, toolCalls } = extractToolCalls(extracted.text);

    if (toolCalls.length > 0) {
      return NextResponse.json({
        content: cleanText || null,
        responseType: "tool_request",
        toolCalls,
        sessionId: extracted.sessionId ?? sessionId ?? null,
      });
    }

    const responseType = classifyResponse(cleanText);

    return NextResponse.json({
      content: cleanText,
      responseType,
      sessionId: extracted.sessionId ?? sessionId ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
