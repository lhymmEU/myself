import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listClawConnections,
  createClawConnection,
  updateClawConnection,
  deleteClawConnection,
} from "@/lib/claw/db";
import { disconnect as disconnectClawSsh } from "@/lib/claw/ssh";

const createSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1),
  authMethod: z.enum(["password", "key"]),
  password: z.string().nullable().optional(),
  privateKey: z.string().nullable().optional(),
  passphrase: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1).optional(),
  authMethod: z.enum(["password", "key"]).optional(),
  password: z.string().nullable().optional(),
  privateKey: z.string().nullable().optional(),
  passphrase: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

function sanitize(connection: Awaited<ReturnType<typeof listClawConnections>>[number]) {
  return {
    id: connection.id,
    name: connection.name,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    authMethod: connection.authMethod,
    isDefault: connection.isDefault,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

bootApp();

export async function GET() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const connections = await listClawConnections(auth.userId);
  return NextResponse.json(
    { connections: connections.map(sanitize) },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.authMethod === "password" && !parsed.data.password) {
    return NextResponse.json(
      { error: "Password required for password auth" },
      { status: 400 },
    );
  }
  if (parsed.data.authMethod === "key" && !parsed.data.privateKey) {
    return NextResponse.json(
      { error: "Private key required for key auth" },
      { status: 400 },
    );
  }
  const created = await createClawConnection(parsed.data, auth.userId);
  return NextResponse.json({ connection: sanitize(created) });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data;
  const updated = await updateClawConnection(id, patch, auth.userId);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  disconnectClawSsh(id, auth.userId);
  return NextResponse.json({ connection: sanitize(updated) });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  disconnectClawSsh(id, auth.userId);
  await deleteClawConnection(id, auth.userId);
  return NextResponse.json({ success: true });
}
