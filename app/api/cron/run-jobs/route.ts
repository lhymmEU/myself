/**
 * GET /api/cron/run-jobs
 *
 * Iterates the `cron_jobs` table and fires each row whose `expression`
 * matches the current minute. Vercel pings this endpoint on the schedule
 * declared in `vercel.json` (every minute by default).
 *
 * In local mode this endpoint also works — you can wire it to a real cron
 * (`* * * * * curl http://localhost:3000/api/cron/run-jobs`) or just leave
 * it idle. Either way, no in-process scheduler is required.
 *
 * Auth: protected by a shared `CRON_SECRET` env var that Vercel sends as
 * `Authorization: Bearer <secret>`. In local dev, set CRON_SECRET="" to
 * skip the check.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { bootApp } from "@/lib/core/init";
import { getDb } from "@/lib/db";
import { cronJobs } from "@/lib/modules/claw/schema";

interface CronRow {
  id: string;
  userId: string;
  name: string;
  expression: string;
  command: string;
  connectionId: string | null;
  enabled: boolean;
}

/**
 * Minimal cron expression matcher that supports:
 *   - `*` (any)
 *   - `N` (literal)
 *   - `*\/N` (every N units)
 *   - comma lists like `0,15,30,45`
 *
 * Format: minute hour day-of-month month day-of-week (5 fields).
 */
function matches(expr: string, now: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [m, h, dom, mon, dow] = fields;
  return (
    matchField(m, now.getUTCMinutes(), 0, 59) &&
    matchField(h, now.getUTCHours(), 0, 23) &&
    matchField(dom, now.getUTCDate(), 1, 31) &&
    matchField(mon, now.getUTCMonth() + 1, 1, 12) &&
    matchField(dow, now.getUTCDay(), 0, 6)
  );
}

function matchField(field: string, value: number, min: number, max: number): boolean {
  if (field === "*") return true;
  for (const part of field.split(",")) {
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (Number.isFinite(step) && step > 0 && (value - min) % step === 0) {
        return true;
      }
      continue;
    }
    const num = parseInt(part, 10);
    if (Number.isFinite(num) && num === value && num >= min && num <= max) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  bootApp();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getDb();
  const rows = db
    .select()
    .from(cronJobs)
    .where(eq(cronJobs.enabled, true))
    .all() as CronRow[];

  const now = new Date();
  const due = rows.filter((row) => matches(row.expression, now));

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const job of due) {
    try {
      await fireJob(job);
      results.push({ id: job.id, ok: true });
      db.update(cronJobs)
        .set({ updatedAt: Date.now() })
        .where(and(eq(cronJobs.id, job.id), eq(cronJobs.userId, job.userId)))
        .run();
    } catch (err) {
      results.push({
        id: job.id,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    fired: results.length,
    results,
  });
}

/**
 * Stub: in this iteration we only log. The real implementation will
 * dispatch by `command` shape (e.g. POST to a webhook, send a
 * notification via the relay, queue a lobster job, etc.).
 */
async function fireJob(job: CronRow): Promise<void> {
  console.log(
    `[cron] Firing job ${job.id} (${job.name}) for user ${job.userId}: ${job.command}`,
  );
}
