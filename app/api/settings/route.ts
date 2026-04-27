import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getAllSettings, updateSetting } from "@/lib/modules/settings/actions";

export async function GET() {
  try {
    bootApp();
  } catch (bootErr) {
    return NextResponse.json(
      { error: bootErr instanceof Error ? bootErr.message : "Boot failed" },
      { status: 500 }
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const settings = await getAllSettings(auth.userId);
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    bootApp();
  } catch (bootErr) {
    return NextResponse.json(
      { error: bootErr instanceof Error ? bootErr.message : "Boot failed" },
      { status: 500 }
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 }
      );
    }
    await updateSetting(key, value, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
