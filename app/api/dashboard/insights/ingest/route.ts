/**
 * Lightweight signal endpoint hit by the bento drop-zone after a URL clip.
 *
 * Pure best-effort acknowledgement: the agent-watcher picks up `marked.upsert`
 * events from the queue on its own, so we don't need to enqueue anything here.
 * Returns the pending dismissals count so the client can show a "you have
 * unsynced verbs" hint if it wants.
 */
import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { listPendingDismissals } from "@/lib/modules/dashboard/insights-actions";

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: { reason?: string; module?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const reason = (body.reason ?? "sources-changed").toString().slice(0, 80);
  const module_ = (body.module ?? "unknown").toString().slice(0, 40);

  const pending = await listPendingDismissals(userId);
  return NextResponse.json({
    queued: true,
    reason,
    module: module_,
    pendingDismissals: pending.length,
  });
}
