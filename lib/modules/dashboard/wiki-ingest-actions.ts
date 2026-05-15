/**
 * Persists wiki-ingest job status and runs the remote openclaw command in a
 * fire-and-forget path (scheduled via `after()` from the route handler).
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { wikiIngestState } from "@/lib/db/schema";
import { executeCommand } from "@/lib/claw/ssh";
import {
  buildOpenclawAgentCommand,
  shellEscape,
} from "@/lib/claw/openclaw-agent";
import { buildWikiIngestMessage } from "@/lib/claw/wiki-preamble";
import { getClawConnection } from "@/lib/claw/db";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getOpenclawRefreshTokenPlain } from "@/lib/modules/dashboard/openclaw-token-actions";
import {
  OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON,
  WIKI_MAINTAINER_SESSION_ID,
} from "@/lib/claw/constants";
import {
  importDashboardJsonString,
  listActiveCards,
} from "@/lib/modules/dashboard/insights-actions";

export type WikiIngestStatusValue = "idle" | "processing" | "done" | "error";

export interface WikiIngestStateRow {
  status: WikiIngestStatusValue;
  detail: string;
  updatedAt: number;
  /** Raw `{ "cards": [...] }` string persisted after a successful remote `cards.json` read. */
  generativeCardsJson: string | null;
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
    return {
      status: "idle",
      detail: "",
      updatedAt: 0,
      generativeCardsJson: null,
    };
  }
  return {
    status: row.status as WikiIngestStatusValue,
    detail: row.detail,
    updatedAt: Number(row.updatedAt),
    generativeCardsJson: row.generativeCardsJson ?? null,
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
  opts?: {
    supabaseAccessToken?: string | null;
    /** Same-browser Supabase session refresh token (pairs with access; survives long ingests). */
    supabaseRefreshToken?: string | null;
  },
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
  const access = opts?.supabaseAccessToken?.trim() || null;
  const refreshFromSession = opts?.supabaseRefreshToken?.trim() || null;
  const refreshStored = await getOpenclawRefreshTokenPlain(userId);
  const refresh = refreshFromSession || refreshStored || null;
  if (!access && !refresh) {
    await upsertWikiIngestState(
      userId,
      "error",
      "OpenClaw Supabase session missing. Save a refresh token under Dashboard → Settings → OpenClaw / wiki ingest, or start ingest while logged in so the browser can send session tokens.",
    );
    return;
  }
  const message = buildWikiIngestMessage({
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    accessToken: access,
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
      userId,
      WIKI_INGEST_TIMEOUT_MS,
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

    const catInner = `test -f ${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON} && cat ${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}`;
    const catCmd = `bash -lc ${shellEscape(catInner)}`;
    const fileRes = await executeCommand(
      connectionId,
      catCmd,
      userId,
      120_000,
    );
    const rawFile = fileRes.stdout?.replace(/^\uFEFF/, "").trim() ?? "";

    let importResult:
      | { ok: true; count: number }
      | { ok: false; reason: string }
      | null = null;
    if (fileRes.code === 0 && rawFile) {
      importResult = await importDashboardJsonString(userId, rawFile);
    }

    let cardNote: string;
    if (fileRes.code !== 0) {
      cardNote = `Could not read remote cards file (${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}); shell exit ${fileRes.code}.`;
    } else if (!rawFile) {
      cardNote = `Remote cards file was empty (${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}).`;
    } else if (!importResult?.ok) {
      cardNote = `Remote cards.json was invalid (${importResult?.reason ?? "unknown"}).`;
    } else {
      cardNote = `Imported ${importResult.count} dashboard card(s) from remote cards.json.`;
    }

    const cardsOk =
      fileRes.code === 0 && rawFile.length > 0 && importResult?.ok === true;

    const cardCount = (await listActiveCards(userId)).length;
    const detailHint = clampDetail(
      `${stdoutBrief} Ingest finished. ${cardNote} Active cards: ${cardCount}.`,
      1200,
    );
    await upsertWikiIngestState(
      userId,
      cardsOk ? "done" : "error",
      detailHint,
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Wiki ingest failed unexpectedly.";
    await upsertWikiIngestState(userId, "error", clampDetail(msg));
  }
}
