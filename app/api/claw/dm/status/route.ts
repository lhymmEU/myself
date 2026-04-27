import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeOpenClawCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const cid = req.nextUrl.searchParams.get("connectionId");
    const connectionId = cid ?? (await getDefaultConnection(auth.userId))?.id;

    if (!connectionId) {
      return NextResponse.json(
        { error: "No connection configured" },
        { status: 400 },
      );
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({
        online: false,
        health: "unknown" as const,
        gatewayRunning: false,
      });
    }

    let online = false;
    let health: "healthy" | "unhealthy" | "unknown" = "unknown";
    let gatewayRunning = false;
    let currentTask: string | undefined;

    try {
      const statusResult = await executeOpenClawCommand(
        connectionId,
        "status --all --json",
        30000,
      );
      if (statusResult.code === 0 && statusResult.stdout.trim()) {
        try {
          const data = JSON.parse(statusResult.stdout.trim());
          online = true;
          gatewayRunning =
            data.gateway?.running ?? data.gatewayRunning ?? false;
          currentTask = data.currentTask ?? data.activeTask ?? undefined;
          // Derive health from the status response if available
          if (data.healthy !== undefined) {
            health = data.healthy ? "healthy" : "unhealthy";
          } else if (data.gateway?.healthy !== undefined) {
            health = data.gateway.healthy ? "healthy" : "unhealthy";
          } else {
            health = online ? "healthy" : "unknown";
          }
        } catch {
          online = statusResult.code === 0;
          health = online ? "healthy" : "unknown";
        }
      }
    } catch {
      // status command timed out or failed — agent is likely offline
    }

    return NextResponse.json({
      online,
      health,
      gatewayRunning,
      currentTask,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
