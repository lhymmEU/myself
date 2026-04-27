import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDb } from "@/lib/db";
import { vaultSecrets } from "@/lib/db/schema/sqlite/vault";
import {
  getAllConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  setDefaultConnection,
} from "@/lib/modules/claw/actions";
import type {
  ClawConnection,
  ClawTransportKind,
  CreateConnectionInput,
  UpdateConnectionInput,
} from "@/lib/modules/claw/types";

type RawTransport = string | undefined | null;

function coerceTransport(raw: RawTransport): ClawTransportKind | undefined {
  if (raw === "edge" || raw === "relay" || raw === "ssh") return raw;
  return undefined;
}

function maskSecrets(c: ClawConnection) {
  return {
    ...c,
    password: c.password ? "••••••" : undefined,
    privateKey: c.privateKey ? "••••••" : undefined,
    passphrase: c.passphrase ? "••••••" : undefined,
  };
}

async function assertVaultSecretOwned(
  secretId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const db = getDb();
  const row = await db
    .select({ id: vaultSecrets.id, category: vaultSecrets.category })
    .from(vaultSecrets)
    .where(
      and(eq(vaultSecrets.id, secretId), eq(vaultSecrets.userId, userId)),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    return {
      ok: false,
      status: 400,
      error:
        "credentialSecretId does not reference a vault secret you own. Create the secret first or unlock the vault.",
    };
  }
  return { ok: true };
}

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const connections = getAllConnections(auth.userId);
    return NextResponse.json(connections.map(maskSecrets));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json()) as Partial<CreateConnectionInput> & {
      transport?: RawTransport;
    };

    const transport = coerceTransport(body.transport) ?? "ssh";
    const credentialSecretId = body.credentialSecretId?.trim() || undefined;

    if (transport === "edge") {
      if (!credentialSecretId) {
        return NextResponse.json(
          {
            error:
              "Edge connections require a credentialSecretId pointing at a vault secret with the SSH credential.",
          },
          { status: 400 },
        );
      }
      const owned = await assertVaultSecretOwned(
        credentialSecretId,
        auth.userId,
      );
      if (!owned.ok) {
        return NextResponse.json(
          { error: owned.error },
          { status: owned.status },
        );
      }
    }

    const input: CreateConnectionInput = {
      name: body.name as string,
      host: body.host as string,
      port: body.port,
      username: body.username as string,
      authMethod: body.authMethod as "password" | "key",
      password: body.password,
      privateKey: body.privateKey,
      passphrase: body.passphrase,
      gatewayPort: body.gatewayPort,
      transport,
      credentialSecretId,
    };

    const conn = createConnection(input, auth.userId);
    return NextResponse.json(maskSecrets(conn));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json()) as
      | (Partial<UpdateConnectionInput> & {
          id: string;
          transport?: RawTransport;
          setDefault?: boolean;
        })
      | { id: string; setDefault: true };

    if ("setDefault" in body && body.setDefault) {
      setDefaultConnection(body.id, auth.userId);
      return NextResponse.json({ success: true });
    }

    const transport = coerceTransport(
      (body as { transport?: RawTransport }).transport,
    );
    const credentialSecretIdRaw = (
      body as { credentialSecretId?: string | null }
    ).credentialSecretId;
    const credentialSecretId =
      credentialSecretIdRaw === null
        ? null
        : typeof credentialSecretIdRaw === "string"
          ? credentialSecretIdRaw.trim() || null
          : undefined;

    if (
      transport === "edge" &&
      typeof credentialSecretId === "string" &&
      credentialSecretId.length > 0
    ) {
      const owned = await assertVaultSecretOwned(
        credentialSecretId,
        auth.userId,
      );
      if (!owned.ok) {
        return NextResponse.json(
          { error: owned.error },
          { status: owned.status },
        );
      }
    }

    const update: UpdateConnectionInput = {
      id: body.id,
      name: body.name,
      host: body.host,
      port: body.port,
      username: body.username,
      authMethod: body.authMethod as "password" | "key" | undefined,
      password: body.password,
      privateKey: body.privateKey,
      passphrase: body.passphrase,
      gatewayPort: body.gatewayPort,
      transport,
      credentialSecretId:
        credentialSecretId === undefined ? undefined : credentialSecretId,
      hostKeyFingerprint: (
        body as { hostKeyFingerprint?: string | null }
      ).hostKeyFingerprint,
    };

    const updated = updateConnection(update, auth.userId);
    if (!updated) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(maskSecrets(updated));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await req.json();
    deleteConnection(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}
