import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getSetting } from "@/lib/modules/settings/actions";

const PROVIDER_KEYS = [
  "fmp_api_key",
  "polygon_api_key",
  "benzinga_api_key",
  "fred_api_key",
  "nasdaq_api_key",
  "intrinio_api_key",
  "alpha_vantage_api_key",
  "biztoc_api_key",
  "tradier_api_key",
  "tradingeconomics_api_key",
  "tiingo_token",
] as const;

export async function GET() {
  bootApp();

  const status: Record<string, boolean> = {};
  for (const key of PROVIDER_KEYS) {
    const val = getSetting(key);
    status[key] = !!val && val.length > 0;
  }

  return NextResponse.json(status);
}
