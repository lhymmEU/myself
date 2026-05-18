import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getWikiIngestState,
  upsertWikiIngestState,
} from "@/lib/modules/dashboard/wiki-ingest-actions";
import { getRegistration } from "@/lib/modules/agent/registration";
import { emitEvent } from "@/lib/modules/agent/emit";

/**
 * GET — return current `wiki_ingest_state` + whether the user has paired an
 *        agent-watcher. The bento polls this while ingest is in flight.
 * POST — enqueue a `regen.cards` event for the watcher to drain. Returns
 *        immediately; the watcher updates `wiki_ingest_state` as it runs.
 */
export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const [state, registration] = await Promise.all([
    getWikiIngestState(auth.userId),
    getRegistration(auth.userId),
  ]);

  return NextResponse.json(
    {
      status: state.status,
      detail: state.detail,
      updatedAt: state.updatedAt,
      generativeCardsJson: state.generativeCardsJson,
      agentConnected: registration.connected,
      agentLastSeenAt: registration.lastSeenAt,
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

  const registration = await getRegistration(auth.userId);
  if (!registration.connected) {
    return NextResponse.json(
      {
        error:
          "No agent watcher paired. Pair one under Dashboard → Settings → Agent.",
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

  await upsertWikiIngestState(auth.userId, "processing", "Queued for watcher…");
  await emitEvent({
    userId: auth.userId,
    eventType: "regen.cards",
    payload: { reason: "manual wiki ingest" },
  });

  return NextResponse.json(
    { accepted: true },
    {
      status: 202,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
