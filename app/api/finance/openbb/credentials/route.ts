import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getSetting } from "@/lib/modules/settings/actions";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

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
  "tradier_account_type",
  "tradingeconomics_api_key",
  "tiingo_token",
] as const;

export async function PUT() {
  bootApp();

  const configDir = join(homedir(), ".openbb_platform");
  const configPath = join(configDir, "user_settings.json");

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(configPath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // file doesn't exist yet
  }

  const credentials: Record<string, string> = {};
  for (const key of PROVIDER_KEYS) {
    const val = getSetting(key);
    if (val) {
      credentials[key] = val;
    }
  }

  const merged = {
    ...existing,
    credentials: {
      ...(typeof existing.credentials === "object" && existing.credentials !== null
        ? existing.credentials
        : {}),
      ...credentials,
    },
  };

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(merged, null, 2), "utf-8");

  return NextResponse.json({ ok: true, keysWritten: Object.keys(credentials).length });
}
