import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

function classifyResponse(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(error|failed|exception|crash|fatal)\b/.test(lower)) return "error";
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

    const b64 = Buffer.from(message).toString("base64");

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
    const responseType = classifyResponse(extracted.text);

    return NextResponse.json({
      content: extracted.text,
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
