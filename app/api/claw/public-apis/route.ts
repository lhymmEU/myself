import { NextRequest, NextResponse } from "next/server";
import {
  parsePublicApis,
  type PublicApisResult,
} from "@/lib/modules/claw/markdown-parsers";

const RAW_URL =
  "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";
const TTL = 6 * 60 * 60 * 1000;

let cache: { data: PublicApisResult; timestamp: number } | null = null;

async function getData(): Promise<PublicApisResult> {
  if (cache && Date.now() - cache.timestamp < TTL) return cache.data;

  const res = await fetch(RAW_URL, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);

  const markdown = await res.text();
  const data = parsePublicApis(markdown);
  cache = { data, timestamp: Date.now() };
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.toLowerCase();
    const category = searchParams.get("category");
    const auth = searchParams.get("auth");
    const forceRefresh = searchParams.get("refresh") === "1";

    if (forceRefresh) cache = null;

    const result = await getData();

    let apis = result.apis;

    if (category) {
      apis = apis.filter((a) => a.category === category);
    }
    if (auth) {
      apis = apis.filter((a) => a.auth.toLowerCase() === auth.toLowerCase());
    }
    if (q) {
      apis = apis.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      categories: result.categories,
      apis,
      total: apis.length,
      totalAll: result.total,
      lastUpdated: cache ? new Date(cache.timestamp).toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch APIs" },
      { status: 500 }
    );
  }
}
