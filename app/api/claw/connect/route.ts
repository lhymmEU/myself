import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  connectSSH,
  disconnectSSH,
  isSSHConnected,
  getDefaultConnection,
  getConnection,
} from "@/lib/modules/claw/actions";

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const { connectionId, action } = await req.json();

    const id = connectionId ?? (await getDefaultConnection(userId))?.id;
    if (!id) {
      return NextResponse.json(
        { error: "No connection configured" },
        { status: 400 }
      );
    }

    if (action === "disconnect") {
      disconnectSSH(id);
      return NextResponse.json({ connected: false });
    }

    if (action === "status") {
      const conn = await getConnection(id, userId);
      return NextResponse.json({
        connected: isSSHConnected(id),
        connectionId: id,
        host: conn?.host,
        username: conn?.username,
      });
    }

    const result = await connectSSH(id);
    if (!result.success) {
      return NextResponse.json(
        { connected: false, error: result.error },
        { status: 400 }
      );
    }

    const conn = await getConnection(id, userId);
    return NextResponse.json({
      connected: true,
      connectionId: id,
      host: conn?.host,
      username: conn?.username,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
