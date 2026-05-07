import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getClawConnection,
  getDefaultClawConnection,
} from "@/lib/claw/db";
import { getSessionLabelMap } from "@/lib/claw/session-labels";
import { executeCommand } from "@/lib/claw/ssh";

bootApp();

const LIST_CMD = `bash -lc ${JSON.stringify(
  "openclaw sessions --json --all-agents --limit 50",
)}`;

export interface ClawSessionRow {
  key: string;
  agentId?: string;
  model?: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  const connection = connectionId
    ? await getClawConnection(connectionId, auth.userId)
    : await getDefaultClawConnection(auth.userId);

  if (!connection) {
    return NextResponse.json(
      {
        sessions: [] as ClawSessionRow[],
        labels: {} as Record<string, string>,
        error: "No claw connection configured",
      },
      { status: 400 },
    );
  }

  const labels = await getSessionLabelMap(connection.id, auth.userId);

  try {
    const { stdout, stderr, code } = await executeCommand(
      connection.id,
      LIST_CMD,
      60_000,
    );
    if (code !== 0) {
      return NextResponse.json({
        sessions: [] as ClawSessionRow[],
        labels,
        error: stderr.trim() || `openclaw sessions exited with code ${code}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout) as unknown;
    } catch {
      return NextResponse.json({
        sessions: [] as ClawSessionRow[],
        labels,
        error: "Invalid JSON from openclaw sessions",
      });
    }
    const rawSessions =
      parsed &&
      typeof parsed === "object" &&
      "sessions" in parsed &&
      Array.isArray((parsed as { sessions: unknown }).sessions)
        ? (parsed as { sessions: unknown[] }).sessions
        : [];

    const sessions: ClawSessionRow[] = [];
    for (const row of rawSessions) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const key = typeof r.key === "string" ? r.key : null;
      if (!key) continue;
      sessions.push({
        key,
        agentId: typeof r.agentId === "string" ? r.agentId : undefined,
        model: typeof r.model === "string" ? r.model : undefined,
      });
    }

    return NextResponse.json({ sessions, labels });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json(
      {
        sessions: [] as ClawSessionRow[],
        labels,
        error: message,
      },
      { status: 500 },
    );
  }
}
