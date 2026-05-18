import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight liveness probe used by Vercel/uptime monitors.
 * Verifies the process is up and the DB driver can be initialised
 * without actually issuing a query.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    const { getDb } = await import("@/lib/db");
    getDb();
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "ready" : "unavailable",
    dbError,
    uptimeMs: process.uptime() * 1000,
    elapsedMs: Date.now() - startedAt,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
  };

  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
