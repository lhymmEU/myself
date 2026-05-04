import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeOpenClawCommand,
  executeCommand,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import { preflight } from "@/lib/modules/claw/health";

const ALLOWED_COMMANDS: Record<string, string> = {
  status: "status --all",
  "status-json": "status --all --json",
  health: "health --json",
  "channels-status": "channels status",
  "channels-list": "channels list",
  "sessions-list": "sessions --all-agents --json",
  "sessions-cleanup-dry": "sessions cleanup --all-agents --dry-run --json",
  "sessions-cleanup": "sessions cleanup --all-agents --enforce --json",
  "gateway-status": "gateway status --json",
  "gateway-start": "gateway start",
  "gateway-stop": "gateway stop",
  "gateway-restart": "gateway restart",
  "gateway-install": "gateway install",
  "gateway-uninstall": "gateway uninstall",
  logs: "logs --limit 200",
  "logs-json": "logs --limit 200 --json",
};

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { connectionId, command, raw } = await req.json();

    const id = connectionId ?? (await getDefaultConnection(auth.userId))?.id;
    if (!id) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }

    // Share the same preflight contract as sessions/dm: a half-dead
    // tunnel returns 503 with reconnectRequired so the UI can auto-heal
    // instead of eating a 30s openclaw hang followed by an opaque 500.
    const pre = await preflight(id);
    if (!pre.ok) {
      return NextResponse.json(pre.body, { status: pre.status });
    }

    // Validate command before hitting the remote so we reject garbage
    // without even queueing an exec.
    if (!raw) {
      const subcommand = ALLOWED_COMMANDS[command];
      if (!subcommand) {
        return NextResponse.json(
          { error: `Unknown command: ${command}. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(", ")}` },
          { status: 400 }
        );
      }
    }

    try {
      const result = raw
        ? await executeCommand(id, raw, 30000)
        : await executeOpenClawCommand(id, ALLOWED_COMMANDS[command], 30000);
      return NextResponse.json(result);
    } catch (err) {
      // The tunnel dropped between preflight and exec, or openclaw itself
      // wedged. Surface a recoverable 503 so the UI treats this as a
      // reconnect hint rather than a hard failure.
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Command failed: ${msg}`, reconnectRequired: true },
        { status: 503 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
