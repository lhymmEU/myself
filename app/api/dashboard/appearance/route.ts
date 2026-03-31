import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getCharacterAppearance,
  upsertCharacterAppearance,
} from "@/lib/modules/dashboard/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const characterType = req.nextUrl.searchParams.get("type") ?? "user";
    const appearance = getCharacterAppearance(characterType);
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
  try {
    const body = await req.json();
    const { characterType, ...colors } = body;
    if (!characterType) {
      return NextResponse.json({ error: "characterType required" }, { status: 400 });
    }
    upsertCharacterAppearance(characterType, colors);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
