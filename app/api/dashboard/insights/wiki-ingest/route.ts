import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getClawConnection,
  getDefaultClawConnection,
  listClawConnections,
} from "@/lib/claw/db";
import {
  getWikiIngestState,
  upsertWikiIngestState,
  runWikiIngestJob,
} from "@/lib/modules/dashboard/wiki-ingest-actions";
import { hasOpenclawRefreshToken } from "@/lib/modules/dashboard/openclaw-token-actions";

/**
 * GET — poll ingest status + whether a default Claw SSH connection exists.
 * POST — enqueue a background wiki ingest (returns 202 immediately; job runs
 *         via `after()` so proxies/browsers do not time out).
 */
export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const conns = await listClawConnections(auth.userId);
  const state = await getWikiIngestState(auth.userId);
  const openclawTokenConfigured = await hasOpenclawRefreshToken(auth.userId);

  return NextResponse.json(
    {
      status: state.status,
      detail: state.detail,
      updatedAt: state.updatedAt,
      hasConnection: conns.length > 0,
      openclawTokenConfigured,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let requestedConnectionId: string | undefined;
  let supabaseAccessToken: string | undefined;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const raw: unknown = await req.json();
      if (raw && typeof raw === "object") {
        const o = raw as {
          connectionId?: unknown;
          supabaseAccessToken?: unknown;
        };
        if (typeof o.connectionId === "string") {
          const id = o.connectionId.trim();
          if (id) requestedConnectionId = id;
        }
        if (typeof o.supabaseAccessToken === "string") {
          const t = o.supabaseAccessToken.trim();
          if (t) supabaseAccessToken = t;
        }
      }
    } catch {
      /* empty or invalid body — fall back to default connection */
    }
  }

  const conn = requestedConnectionId
    ? await getClawConnection(requestedConnectionId, auth.userId)
    : await getDefaultClawConnection(auth.userId);
  if (!conn) {
    return NextResponse.json(
      {
        error: requestedConnectionId
          ? "That SSH connection was not found. Refresh the connection list or pick another in Dashboard → Claw."
          : "No Claw connection configured. Open Claw and save an SSH connection first.",
      },
      { status: 400 },
    );
  }

  const hasStoredRefresh = await hasOpenclawRefreshToken(auth.userId);
  if (!hasStoredRefresh && !supabaseAccessToken) {
    return NextResponse.json(
      {
        error:
          "Save your Supabase refresh token (Dashboard → Settings → OpenClaw / wiki ingest), or stay logged in so ingest can send a short-lived access token. Wiki ingest needs one of these.",
      },
      { status: 400 },
    );
  }

  const current = await getWikiIngestState(auth.userId);
  if (current.status === "processing") {
    return NextResponse.json(
      { error: "Wiki ingest is already running." },
      { status: 409 },
    );
  }

  await upsertWikiIngestState(auth.userId, "processing", "Queued…");

  const connectionId = conn.id;
  const userId = auth.userId;

  after(async () => {
    await runWikiIngestJob(connectionId, userId, {
      supabaseAccessToken,
    });
  });

  return NextResponse.json(
    { accepted: true },
    {
      status: 202,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
