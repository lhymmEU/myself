/**
 * Lightweight signal endpoint hit by:
 *   - the dashboard event listeners (when plans / marked / wishlist change), and
 *   - the bento UI's drop-zone after a manual URL clip.
 *
 * The endpoint just records a "sources changed" intent. The actual ingest
 * (running openclaw with the wiki preamble) happens client-side via the
 * existing /api/claw/chat route — that way the SSH/SSE stream is owned by
 * the browser and we don't need a server-side queue.
 *
 * For now the endpoint is a no-op write that returns the latest dismissals
 * count so a client can decide whether to nudge openclaw. We deliberately
 * keep this thin so it can be made richer later (debouncing, queue, …)
 * without changing the contract.
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
