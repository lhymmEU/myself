import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  resolveAgentToolsHttpUrl,
  resolvePublicAppOrigin,
} from "@/lib/core/public-app-origin";

bootApp();

/**
 * Returns the canonical HTTP URL for agent tools (`/api/agent`) for this deployment,
 * plus the resolved public origin. Used by the Claw UI and for openclaw configuration.
 */
export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const origin = resolvePublicAppOrigin(req);
  const agentToolsHttpUrl = resolveAgentToolsHttpUrl(req);

  return NextResponse.json({
    origin,
    agentToolsHttpUrl,
  });
}
