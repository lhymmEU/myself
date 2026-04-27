import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeOpenClawCommand,
  executeCommand,
  isSSHConnected,
} from "@/lib/modules/claw/actions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const { connectionId, name, expression, command, enabled, timezone, channel, deliveryTo } = body;

    if (!connectionId || !isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const flags: string[] = [];
    if (name) flags.push(`--name "${name.replace(/"/g, '\\"')}"`);
    if (expression) {
      if (expression.startsWith("at ")) {
        flags.push(`--at "${expression.slice(3)}"`);
      } else {
        flags.push(`--cron "${expression}"`);
      }
    }
    if (timezone) flags.push(`--tz "${timezone}"`);

    if (command) {
      const b64Msg = Buffer.from(command).toString("base64");
      flags.push(`--message "$(echo ${b64Msg} | base64 -d)"`);
    }

    if (enabled === true) flags.push("--enable");
    if (enabled === false) flags.push("--disable");
    if (channel) flags.push(`--channel "${channel.replace(/"/g, '\\"')}"`);
    if (deliveryTo) flags.push(`--delivery-to "${deliveryTo.replace(/"/g, '\\"')}"`);


    if (flags.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await executeCommand(
      connectionId,
      `openclaw cron edit ${id} ${flags.join(" ")}`,
      15000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `cron edit failed: ${(result.stderr || result.stdout).slice(0, 300)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const connectionId = req.nextUrl.searchParams.get("connectionId");

    if (!connectionId || !isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const result = await executeOpenClawCommand(
      connectionId,
      `cron rm ${id}`,
      15000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `cron rm failed: ${(result.stderr || result.stdout).slice(0, 300)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
