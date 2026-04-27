import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeOpenClawCommand,
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

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

    const id = connectionId ?? getDefaultConnection(auth.userId)?.id;
    if (!id) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }

    if (!isSSHConnected(id)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    if (raw) {
      const result = await executeCommand(id, raw, 30000);
      return NextResponse.json(result);
    }

    const subcommand = ALLOWED_COMMANDS[command];
    if (!subcommand) {
      return NextResponse.json(
        { error: `Unknown command: ${command}. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await executeOpenClawCommand(id, subcommand, 30000);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
