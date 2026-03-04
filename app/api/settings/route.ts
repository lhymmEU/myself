import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getAllSettings, updateSetting } from "@/lib/modules/settings/actions";

export async function GET() {
  bootApp();
  try {
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 }
      );
    }
    await updateSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
