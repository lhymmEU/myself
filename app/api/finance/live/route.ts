import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getSetting } from "@/lib/modules/settings/actions";
import { fetchBinancePortfolio } from "@/lib/modules/finance/binance";
import { fetchPolkadotBalances } from "@/lib/modules/finance/polkadot";

export async function GET(req: NextRequest) {
  bootApp();
  const source = req.nextUrl.searchParams.get("source");

  try {
    if (source === "binance") {
      const apiKey = getSetting("binance_api_key");
      const apiSecret = getSetting("binance_api_secret");
      if (!apiKey || !apiSecret) {
        return NextResponse.json(
          { error: "Binance API credentials not configured. Go to Settings to add them." },
          { status: 400 }
        );
      }
      const portfolio = await fetchBinancePortfolio(apiKey, apiSecret);
      return NextResponse.json(portfolio);
    }

    if (source === "polkadot") {
      const walletsRaw = getSetting("polkadot_wallets") ?? "";
      const addresses = walletsRaw
        .split(/[\n,]+/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (!addresses.length) {
        return NextResponse.json(
          { error: "No Polkadot wallets configured. Go to Settings to add them." },
          { status: 400 }
        );
      }
      const portfolio = await fetchPolkadotBalances(addresses);
      return NextResponse.json(portfolio);
    }

    return NextResponse.json(
      { error: 'Invalid source. Use ?source=binance or ?source=polkadot' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
