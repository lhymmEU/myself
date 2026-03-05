import { NextRequest, NextResponse } from "next/server";
import { fetchMarketTickers } from "@/lib/modules/finance/binance";
import { fetchPolymarkets } from "@/lib/modules/finance/polymarket";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");

  try {
    if (source === "binance") {
      const symbolsParam = req.nextUrl.searchParams.get("symbols");
      const symbols = symbolsParam
        ? symbolsParam.split(",").map((s) => s.trim())
        : undefined;
      const tickers = await fetchMarketTickers(symbols);
      return NextResponse.json({ tickers });
    }

    if (source === "polymarket") {
      const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
      const markets = await fetchPolymarkets(limit);
      return NextResponse.json({ markets });
    }

    return NextResponse.json(
      { error: 'Invalid source. Use ?source=binance or ?source=polymarket' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
