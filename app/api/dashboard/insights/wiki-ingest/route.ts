import { NextResponse } from "next/server";
import { after } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDefaultClawConnection } from "@/lib/claw/db";
import {
  getWikiIngestState,
  upsertWikiIngestState,
  runWikiIngestJob,
} from "@/lib/modules/dashboard/wiki-ingest-actions";

/**
 * GET — poll ingest status + whether a default Claw SSH connection exists.
 * POST — enqueue a background wiki ingest (returns 202 immediately; job runs
 *         via `after()` so proxies/browsers do not time out).
 */
export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const conn = await getDefaultClawConnection(auth.userId);
  const state = await getWikiIngestState(auth.userId);

  return NextResponse.json(
    {
      status: state.status,
      detail: state.detail,
      updatedAt: state.updatedAt,
      hasConnection: !!conn,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export async function POST() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const conn = await getDefaultClawConnection(auth.userId);
  if (!conn) {
    return NextResponse.json(
      {
        error:
          "No Claw connection configured. Open Claw and save an SSH connection first.",
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
    await runWikiIngestJob(connectionId, userId);
  });

  return NextResponse.json(
    { accepted: true },
    {
      status: 202,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
