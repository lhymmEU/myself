/**
 * Persists wiki-ingest job status and runs the remote openclaw command in a
 * fire-and-forget path (scheduled via `after()` from the route handler).
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { wikiIngestState } from "@/lib/db/schema";
import { extractDashboardJsonFromWikiIngestStdout } from "@/lib/claw/dashboard-stdout";
import { executeCommand } from "@/lib/claw/ssh";
import { buildOpenclawAgentCommand } from "@/lib/claw/openclaw-agent";
import { buildWikiIngestMessage } from "@/lib/claw/wiki-preamble";
import { getClawConnection } from "@/lib/claw/db";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getOpenclawRefreshTokenPlain } from "@/lib/modules/dashboard/openclaw-token-actions";
import { WIKI_MAINTAINER_SESSION_ID } from "@/lib/claw/constants";
import {
  importDashboardJsonString,
  listActiveCards,
} from "@/lib/modules/dashboard/insights-actions";

export type WikiIngestStatusValue = "idle" | "processing" | "done" | "error";

export interface WikiIngestStateRow {
  status: WikiIngestStatusValue;
  detail: string;
  updatedAt: number;
}

/** SSH/exec budget — keep in sync with `openclaw agent --timeout` below. */
export const WIKI_INGEST_TIMEOUT_MS = 900_000;
const AGENT_TIMEOUT_SEC = 900;

function clampDetail(s: string, max = 1200): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function getWikiIngestState(
  userId: string,
): Promise<WikiIngestStateRow> {
  const rows = await getDb()
    .select()
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { status: "idle", detail: "", updatedAt: 0 };
  }
  return {
    status: row.status as WikiIngestStatusValue,
    detail: row.detail,
    updatedAt: Number(row.updatedAt),
  };
}

export async function upsertWikiIngestState(
  userId: string,
  status: WikiIngestStatusValue,
  detail: string,
): Promise<void> {
  const now = Date.now();
  const db = getDb();
  const existing = await db
    .select()
    .from(wikiIngestState)
    .where(eq(wikiIngestState.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(wikiIngestState)
      .set({ status, detail, updatedAt: now })
      .where(eq(wikiIngestState.userId, userId));
  } else {
    await db.insert(wikiIngestState).values({
      userId,
      status,
      detail,
      updatedAt: now,
    });
  }
}

/**
 * Runs on the server after the HTTP response is sent. Uses a long SSH/exec
 * timeout so openclaw can finish ingest + publish without the browser waiting.
 */
export async function runWikiIngestJob(
  connectionId: string,
  userId: string,
): Promise<void> {
  const connCheck = await getClawConnection(connectionId, userId);
  if (!connCheck) {
    await upsertWikiIngestState(
      userId,
      "error",
      "SSH connection not found. Refresh Claw connections.",
    );
    return;
  }
  const refresh = await getOpenclawRefreshTokenPlain(userId);
  if (!refresh) {
    await upsertWikiIngestState(
      userId,
      "error",
      "OpenClaw refresh token missing. Save it under Dashboard → Settings → OpenClaw / wiki ingest.",
    );
    return;
  }
  const message = buildWikiIngestMessage({
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    refreshToken: refresh,
  });
  const command = buildOpenclawAgentCommand({
    message,
    sessionId: WIKI_MAINTAINER_SESSION_ID,
    agentTimeoutSec: AGENT_TIMEOUT_SEC,
  });

  try {
    const result = await executeCommand(
      connectionId,
      command,
      WIKI_INGEST_TIMEOUT_MS,
      userId,
    );
    if (result.code !== 0) {
      const errText = clampDetail(
        result.stderr || result.stdout || `exit ${result.code}`,
      );
      await upsertWikiIngestState(userId, "error", errText);
      return;
    }
    const stdoutBrief = clampDetail(
      result.stdout.replace(/\s+/g, " ").trim() || "openclaw finished.",
      400,
    );

    let ingestNotes = "";
    const jsonRaw = extractDashboardJsonFromWikiIngestStdout(result.stdout);
    if (jsonRaw) {
      const imp = await importDashboardJsonString(userId, jsonRaw);
      if (imp.ok) {
        ingestNotes = ` Imported ${imp.count} card(s) from agent stdout handoff.`;
      } else {
        ingestNotes = ` Dashboard JSON in stdout but not imported (${imp.reason}).`;
      }
    } else {
      ingestNotes =
        " No <<<MYSELF_DASHBOARD_JSON_*>>> block found in openclaw stdout.";
    }

    const cardCount = (await listActiveCards(userId)).length;
    const okHint =
      cardCount === 0
        ? clampDetail(
            `${stdoutBrief}${ingestNotes} The wiki-maintainer preamble requires a MYSELF_DASHBOARD_JSON block in stdout after tools complete.`,
            1200,
          )
        : clampDetail(`${stdoutBrief}${ingestNotes}`, 1200);
    await upsertWikiIngestState(userId, "done", okHint);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Wiki ingest failed unexpectedly.";
    await upsertWikiIngestState(userId, "error", clampDetail(msg));
  }
}
