import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

interface HistoryMessage {
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

/**
 * OpenClaw stores conversation transcripts as JSONL files at:
 *   ~/.openclaw/agents/<agentId>/sessions/<sessionKey>.jsonl
 *
 * Each line is a JSON object. Message entries have:
 *   { "type": "message", "timestamp": "...", "message": { "role": "user"|"assistant", "content": [...] } }
 *
 * content is an array of blocks — we extract text from { "type": "text", "text": "..." } blocks.
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") {
        texts.push(b.text);
      }
    }
  }
  return texts.join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { id: sessionKey } = await params;
    const cid = req.nextUrl.searchParams.get("connectionId");
    const agentId = req.nextUrl.searchParams.get("agentId");
    const connectionId = cid ?? (await getDefaultConnection(auth.userId))?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const safeAgent = agentId.replace(/['"\\$`!]/g, "");
    const safeKey = sessionKey.replace(/['"\\$`!]/g, "");

    // OpenClaw sessions have a compound `key` (e.g. "agent:main:cron:UUID:run:UUID")
    // and a separate `sessionId` UUID that names the transcript file on disk.
    const transcriptId = req.nextUrl.searchParams.get("transcriptId");
    const fileId = transcriptId
      ? transcriptId.replace(/['"\\$`!]/g, "")
      : safeKey.includes(":") ? safeKey.split(":").pop()! : safeKey;

    // Per OpenClaw docs, transcripts live at:
    //   ~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl
    // Tilde must NOT be quoted so bash expands it inside `bash -lc '...'`.
    const transcriptPath = `~/.openclaw/agents/${safeAgent}/sessions/${fileId}.jsonl`;
    const catRes = await executeCommand(
      connectionId,
      `cat ${transcriptPath} 2>/dev/null || echo ""`,
      60000,
    );

    const messages: HistoryMessage[] = [];
    const raw = catRes.stdout || "";

    if (raw.trim()) {
      const lines = raw.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>;

          if (entry.type !== undefined && entry.type !== "message") continue;

          const msg = entry.message as Record<string, unknown> | undefined;
          if (!msg) continue;

          const role = msg.role as string;
          if (role !== "user" && role !== "assistant") continue;

          const text = extractTextFromContent(msg.content);
          if (!text.trim()) continue;

          let timestamp: number;
          if (typeof entry.timestamp === "string") {
            timestamp = new Date(entry.timestamp).getTime();
          } else if (typeof entry.timestamp === "number") {
            timestamp = entry.timestamp;
          } else {
            timestamp = Date.now();
          }

          messages.push({
            role: role === "user" ? "user" : "agent",
            content: text,
            timestamp,
          });
        } catch {
          // skip malformed lines
        }
      }
    }

    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
