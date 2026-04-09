import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { fetchUrlMeta } from "@/lib/modules/marked/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url)
      return NextResponse.json({ error: "Missing url param" }, { status: 400 });

    const meta = await fetchUrlMeta(url);
    return NextResponse.json(meta);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
