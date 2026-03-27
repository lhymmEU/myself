import { NextRequest, NextResponse } from "next/server";
import {
  parseCliTools,
  type CliToolsResult,
} from "@/lib/modules/claw/markdown-parsers";

const RAW_URL =
  "https://raw.githubusercontent.com/agarrharr/awesome-cli-apps/master/readme.md";
const TTL = 6 * 60 * 60 * 1000;

let cache: { data: CliToolsResult; timestamp: number } | null = null;

async function getData(): Promise<CliToolsResult> {
  if (cache && Date.now() - cache.timestamp < TTL) return cache.data;

  const res = await fetch(RAW_URL, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);

  const markdown = await res.text();
  const data = parseCliTools(markdown);
  cache = { data, timestamp: Date.now() };
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.toLowerCase();
    const category = searchParams.get("category");
    const forceRefresh = searchParams.get("refresh") === "1";

    if (forceRefresh) cache = null;

    const result = await getData();

    let tools = result.tools;

    if (category) {
      tools = tools.filter((t) => t.category === category);
    }
    if (q) {
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.subcategory?.toLowerCase().includes(q) ?? false)
      );
    }

    return NextResponse.json({
      categories: result.categories,
      tools,
      total: tools.length,
      totalAll: result.total,
      lastUpdated: cache ? new Date(cache.timestamp).toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch CLI tools",
      },
      { status: 500 }
    );
  }
}
