import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { isLocal } from "@/lib/core/runtime";
import { requireUserId } from "@/lib/core/route-helpers";
import { fetchOpenBB, checkConnection } from "@/lib/modules/finance/openbb-client";

export async function GET(req: NextRequest) {
  bootApp();
  if (!isLocal()) {
    return NextResponse.json(
      {
        error:
          "OpenBB market data is only available when DEPLOYMENT_MODE=local (self-hosted OpenBB).",
      },
      { status: 410 },
    );
  }

  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const endpoint = req.nextUrl.searchParams.get("endpoint");

  if (endpoint === "__health") {
    const ok = await checkConnection(userId);
    return NextResponse.json({ connected: ok });
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing 'endpoint' query parameter" },
      { status: 400 },
    );
  }

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "endpoint") {
      params[key] = value;
    }
  });

  try {
    const data = await fetchOpenBB(endpoint, params, userId);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isConnectionError =
      message.includes("ECONNREFUSED") || message.includes("fetch failed");
    return NextResponse.json(
      {
        error: isConnectionError
          ? "OpenBB API is not running. Start it with: openbb-api --host 127.0.0.1 --port 6900"
          : message,
      },
      { status: isConnectionError ? 503 : 500 },
    );
  }
}
