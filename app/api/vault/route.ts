import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getCloudVaultStatus,
  getCloudVaultInfo,
  setupCloudVault,
  listCloudSecretMeta,
  getCloudSecretCipher,
  createCloudSecret,
  updateCloudSecret,
  deleteCloudSecret,
  rotateCloudVault,
  type CloudReencryptSecret,
} from "@/lib/modules/vault/cloud-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const action = req.nextUrl.searchParams.get("action");

    if (action === "status") {
      return NextResponse.json(await getCloudVaultStatus(userId));
    }
    if (action === "info") {
      return NextResponse.json(await getCloudVaultInfo(userId));
    }

    const id = req.nextUrl.searchParams.get("id");
    const format = req.nextUrl.searchParams.get("format");

    if (id) {
      const cipher = await getCloudSecretCipher(id, userId);
      if (!cipher) {
        return NextResponse.json({ error: "Secret not found" }, { status: 404 });
      }
      return NextResponse.json(cipher);
    }

    if (format === "cipher") {
      const secrets: NonNullable<
        Awaited<ReturnType<typeof getCloudSecretCipher>>
      >[] = [];
      const metas = await listCloudSecretMeta(userId);
      for (const meta of metas) {
        const c = await getCloudSecretCipher(meta.id, userId);
        if (c) secrets.push(c);
      }
      return NextResponse.json(secrets);
    }

    return NextResponse.json(await listCloudSecretMeta(userId));
  } catch (err) {
    console.error("[vault GET]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const action = req.nextUrl.searchParams.get("action");
    const body = await req.json();

    if (action === "setup") {
      if (!body.salt || !body.verificationHash) {
        return NextResponse.json(
          { error: "Vault setup requires client-derived salt + verificationHash" },
          { status: 400 },
        );
      }
      await setupCloudVault(userId, body.salt, body.verificationHash);
      return NextResponse.json({ success: true });
    }

    if (action === "unlock" || action === "lock") {
      return NextResponse.json({ success: true });
    }

    if (
      body.encryptedValue === undefined ||
      body.nonce === undefined ||
      !body.name
    ) {
      return NextResponse.json(
        { error: "Secrets require encryptedValue + nonce + name" },
        { status: 400 },
      );
    }

    const created = await createCloudSecret(
      {
        name: body.name,
        category: body.category,
        encryptedValue: body.encryptedValue,
        nonce: body.nonce,
        encryptedNotes: body.encryptedNotes ?? null,
        notesNonce: body.notesNonce ?? null,
        tags: body.tags,
      },
      userId,
    );
    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const body = await req.json();
    const result = await updateCloudSecret(
      {
        id: body.id,
        name: body.name,
        category: body.category,
        encryptedValue: body.encryptedValue,
        nonce: body.nonce,
        encryptedNotes: body.encryptedNotes,
        notesNonce: body.notesNonce,
        tags: body.tags,
      },
      userId,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteCloudSecret(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const action = req.nextUrl.searchParams.get("action");
    const body = await req.json();

    if (action === "change-password") {
      if (!body.newSalt || !body.newVerificationHash) {
        return NextResponse.json(
          { error: "Password rotation requires client-derived salt + hash" },
          { status: 400 },
        );
      }
      const reencrypted = (body.reencrypted ?? []) as CloudReencryptSecret[];
      await rotateCloudVault(
        userId,
        body.newSalt,
        body.newVerificationHash,
        reencrypted,
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
