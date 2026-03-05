import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const connectionId =
      req.nextUrl.searchParams.get("connectionId") ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const result = await executeCommand(
      connectionId,
      "cat ~/.openclaw/openclaw.json 2>/dev/null || echo '{}'",
      10000
    );

    return NextResponse.json({ config: result.stdout.trim(), code: result.code });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const { connectionId: cid, config } = await req.json();
    const connectionId = cid ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    JSON.parse(config);

    const escaped = config.replace(/'/g, "'\\''");
    const result = await executeCommand(
      connectionId,
      `mkdir -p ~/.openclaw && echo '${escaped}' > ~/.openclaw/openclaw.json`,
      10000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.stderr || "Failed to write config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
