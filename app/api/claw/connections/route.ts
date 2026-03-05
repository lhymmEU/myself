import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  setDefaultConnection,
} from "@/lib/modules/claw/actions";

export async function GET() {
  bootApp();
  try {
    const connections = getAllConnections();
    const safe = connections.map((c) => ({
      ...c,
      password: c.password ? "••••••" : undefined,
      privateKey: c.privateKey ? "••••••" : undefined,
      passphrase: c.passphrase ? "••••••" : undefined,
    }));
    return NextResponse.json(safe);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const conn = createConnection(body);
    return NextResponse.json({
      ...conn,
      password: conn.password ? "••••••" : undefined,
      privateKey: conn.privateKey ? "••••••" : undefined,
      passphrase: conn.passphrase ? "••••••" : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    if (body.setDefault) {
      setDefaultConnection(body.id);
      return NextResponse.json({ success: true });
    }
    const updated = updateConnection(body);
    if (!updated) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...updated,
      password: updated.password ? "••••••" : undefined,
      privateKey: updated.privateKey ? "••••••" : undefined,
      passphrase: updated.passphrase ? "••••••" : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  try {
    const { id } = await req.json();
    deleteConnection(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
