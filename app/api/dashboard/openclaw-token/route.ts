import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  clearOpenclawRefreshToken,
  hasOpenclawRefreshToken,
  setOpenclawRefreshToken,
} from "@/lib/modules/dashboard/openclaw-token-actions";

bootApp();

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const configured = await hasOpenclawRefreshToken(auth.userId);
  return NextResponse.json(
    { configured },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

const putSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "refreshToken required (string)" },
      { status: 400 },
    );
  }
  try {
    await setOpenclawRefreshToken(auth.userId, parsed.data.refreshToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  await clearOpenclawRefreshToken(auth.userId);
  return NextResponse.json({ ok: true });
}
