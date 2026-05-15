import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getRegistration,
  revokeAgent,
  rotateAgentToken,
} from "@/lib/modules/agent/registration";
import { getSupabaseUrl } from "@/lib/supabase/env";

export async function GET() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await getRegistration(auth.userId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as { label?: string };
    const label = (body.label ?? "").toString();
    const issued = await rotateAgentToken(auth.userId, label);
    return NextResponse.json({
      token: issued.token,
      supabaseUrl: getSupabaseUrl(),
      userId: auth.userId,
      issuedAt: issued.issuedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    await revokeAgent(auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
