import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import { emitEvent } from "@/lib/modules/agent/emit";
import type { AgentEventType } from "@/lib/db/schema/postgres/agent";

const VALID_TYPES: ReadonlySet<AgentEventType> = new Set<AgentEventType>([
  "page.upsert",
  "marked.upsert",
  "wish.upsert",
  "wish.expand",
  "dismissal.create",
  "regen.cards",
  "bootstrap.full",
]);

interface Body {
  eventType?: string;
  payload?: unknown;
  sourceRef?: { table: string; id: string };
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.eventType || !VALID_TYPES.has(body.eventType as AgentEventType)) {
    return NextResponse.json(
      { error: `Unknown event_type: ${body.eventType}` },
      { status: 400 },
    );
  }
  try {
    const result = await emitEvent({
      userId: auth.userId,
      eventType: body.eventType as AgentEventType,
      payload: body.payload ?? null,
      sourceRef: body.sourceRef,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
