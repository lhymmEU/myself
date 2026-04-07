import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import { appendFileSync } from "fs";

// #region agent log
function debugLog(msg: string, data: Record<string, unknown>, hyp: string) {
  try {
    appendFileSync('/Users/magicsheep/Portfolio/myself/.cursor/debug-209874.log',
      JSON.stringify({sessionId:'209874',location:'history/route.ts',message:msg,data,timestamp:Date.now(),hypothesisId:hyp})+'\n');
  } catch {}
}
// #endregion

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
  try {
    const { id: sessionKey } = await params;
    const cid = req.nextUrl.searchParams.get("connectionId");
    const agentId = req.nextUrl.searchParams.get("agentId");
    const connectionId = cid ?? getDefaultConnection()?.id;

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
    // #region agent log
    debugLog('path params',{fileId,transcriptPath,safeKey,safeAgent},'C');
    // #endregion
    const catRes = await executeCommand(
      connectionId,
      `cat ${transcriptPath} 2>/dev/null || echo ""`,
      60000,
    );
    // #region agent log
    debugLog('cat result',{exitCode:catRes.code,stdoutLen:catRes.stdout?.length??0,stderrLen:catRes.stderr?.length??0,stdoutPreview:(catRes.stdout||'').substring(0,500)},'A');
    // #endregion

    const messages: HistoryMessage[] = [];
    const raw = catRes.stdout || "";

    if (raw.trim()) {
      const lines = raw.split("\n").filter((l) => l.trim());
      // #region agent log
      debugLog('parsing lines',{lineCount:lines.length,firstLinePreview:lines[0]?.substring(0,300)},'D');
      // #endregion
      let skippedType = 0, skippedNoMsg = 0, skippedRole = 0, skippedEmpty = 0, parseErrors = 0;
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>;

          // Skip non-message entries (e.g. type: "session" metadata)
          if (entry.type !== undefined && entry.type !== "message") { skippedType++; continue; }

          const msg = entry.message as Record<string, unknown> | undefined;
          if (!msg) { skippedNoMsg++; continue; }

          const role = msg.role as string;
          if (role !== "user" && role !== "assistant") { skippedRole++; continue; }

          const text = extractTextFromContent(msg.content);
          if (!text.trim()) { skippedEmpty++; continue; }

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
          parseErrors++;
        }
      }
      // #region agent log
      debugLog('parsing summary',{totalLines:lines.length,parsedMessages:messages.length,skippedType,skippedNoMsg,skippedRole,skippedEmpty,parseErrors},'D');
      // #endregion
    } else {
      // #region agent log
      debugLog('raw output empty',{rawLength:raw.length},'A');
      // #endregion
    }

    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
