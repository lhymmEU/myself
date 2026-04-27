import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getCharacterAppearance,
  upsertCharacterAppearance,
} from "@/lib/modules/dashboard/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const characterType = req.nextUrl.searchParams.get("type") ?? "user";
    const appearance = getCharacterAppearance(characterType, auth.userId);
    return NextResponse.json({ appearance });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { characterType, ...colors } = body;
    if (!characterType) {
      return NextResponse.json({ error: "characterType required" }, { status: 400 });
    }
    upsertCharacterAppearance(characterType, colors, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
