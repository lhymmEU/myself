import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  upsertSessionMeta,
  deleteSessionMetaByKeys,
} from "@/lib/modules/claw/session-meta";

interface PutBody {
  connectionId: string;
  agentId: string;
  name?: string | null;
  pinnedAt?: number | null;
}

/**
 * PUT — rename or pin a single session by its compound openclaw
 * session key. The route param is the `sessionId` (the key returned
 * by `openclaw sessions --json`); `connectionId` and `agentId` come
 * in the body so we can scope the upsert.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  try {
    const { key } = await ctx.params;
    const sessionId = decodeURIComponent(key);
    const body = (await req.json()) as Partial<PutBody>;

    if (!body.connectionId || !body.agentId) {
      return NextResponse.json(
        { error: "connectionId and agentId are required" },
        { status: 400 },
      );
    }

    const record = await upsertSessionMeta(
      {
        connectionId: body.connectionId,
        agentId: body.agentId,
        sessionId,
      },
      {
        name: body.name === undefined ? undefined : body.name?.trim() || null,
        pinnedAt: body.pinnedAt,
      },
      auth.userId,
    );

    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE — remove the friendly metadata for a session. The session
 * itself is not affected; this only clears the row in `claw_session_meta`.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  try {
    const { key } = await ctx.params;
    const sessionId = decodeURIComponent(key);
    const connectionId = req.nextUrl.searchParams.get("connectionId");
    const agentId = req.nextUrl.searchParams.get("agentId");
    if (!connectionId || !agentId) {
      return NextResponse.json(
        { error: "connectionId and agentId are required" },
        { status: 400 },
      );
    }
    await deleteSessionMetaByKeys(
      [{ connectionId, agentId, sessionId }],
      auth.userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
