import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  bulkImportSessionNames,
  listSessionMeta,
  upsertSessionMeta,
} from "@/lib/modules/claw/session-meta";

/**
 * GET — list friendly session-meta rows for the current user.
 * Optional `connectionId` query trims the result to one connection,
 * which is what the dashboard chat needs in practice.
 */
export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  try {
    const cid = req.nextUrl.searchParams.get("connectionId") ?? undefined;
    const records = await listSessionMeta(auth.userId, cid);
    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

interface BulkUpsertPayload {
  records: Array<{
    connectionId: string;
    agentId: string;
    sessionId: string;
    name?: string | null;
    pinnedAt?: number | null;
  }>;
}

/**
 * POST — upsert one or many session-meta records.
 *
 * Used both for the one-time `localStorage` migration on first load
 * and as a bulk-rename hook. Each record is keyed by the compound
 * `(connectionId, agentId, sessionId)` triple.
 */
export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  try {
    const body = (await req.json()) as Partial<BulkUpsertPayload>;
    const records = Array.isArray(body.records) ? body.records : [];

    if (records.length === 0) {
      return NextResponse.json({ imported: 0 });
    }

    const sanitised = records
      .filter(
        (r): r is BulkUpsertPayload["records"][number] =>
          typeof r?.connectionId === "string" &&
          typeof r.agentId === "string" &&
          typeof r.sessionId === "string",
      )
      .map((r) => ({
        connectionId: r.connectionId,
        agentId: r.agentId,
        sessionId: r.sessionId,
        name: typeof r.name === "string" ? r.name : "",
      }))
      .filter((r) => r.name.trim().length > 0);

    const imported = await bulkImportSessionNames(sanitised, auth.userId);

    // Apply pin updates separately — they don't go through the bulk
    // helper so we don't accidentally clear names with empty strings.
    for (const r of records) {
      if (r.pinnedAt !== undefined) {
        await upsertSessionMeta(
          {
            connectionId: r.connectionId,
            agentId: r.agentId,
            sessionId: r.sessionId,
          },
          { pinnedAt: r.pinnedAt },
          auth.userId,
        );
      }
    }

    return NextResponse.json({ imported });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
