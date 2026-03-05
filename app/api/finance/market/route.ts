import { NextRequest, NextResponse } from "next/server";
import {
  listMarkets,
  searchMarkets,
  getMarket,
} from "@/lib/modules/finance/polymarket";
import { fetchNews, NEWS_CATEGORIES } from "@/lib/modules/finance/news";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  try {
    if (action === "list") {
      const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
      const markets = await listMarkets(limit);
      return NextResponse.json({ markets });
    }

    if (action === "search") {
      const q = req.nextUrl.searchParams.get("q") ?? "";
      if (!q.trim()) {
        return NextResponse.json(
          { error: "Missing search query (?q=...)" },
          { status: 400 }
        );
      }
      const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);
      const markets = await searchMarkets(q, limit);
      return NextResponse.json({ markets });
    }

    if (action === "detail") {
      const slug = req.nextUrl.searchParams.get("slug") ?? "";
      if (!slug.trim()) {
        return NextResponse.json(
          { error: "Missing slug (?slug=...)" },
          { status: 400 }
        );
      }
      const market = await getMarket(slug);
      if (!market) {
        return NextResponse.json(
          { error: "Market not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ market });
    }

    if (action === "news") {
      const category = req.nextUrl.searchParams.get("category") ?? "top";
      const articles = await fetchNews(category);
      return NextResponse.json({ articles, categories: NEWS_CATEGORIES });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=list|search|events|detail|news" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
