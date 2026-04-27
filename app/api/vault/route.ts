import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { isCloud } from "@/lib/core/runtime";
import {
  getVaultStatus,
  setupVault,
  unlockVault,
  lockVault,
  getAllSecrets,
  getSecret,
  createSecret,
  updateSecret,
  deleteSecret,
  changePassword,
  changeVaultPath,
} from "@/lib/modules/vault/actions";
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

    if (isCloud()) {
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
          return NextResponse.json(
            { error: "Secret not found" },
            { status: 404 },
          );
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
    }

    if (action === "status") {
      return NextResponse.json(await getVaultStatus(userId));
    }

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const secret = await getSecret(id, userId);
      if (!secret) {
        return NextResponse.json({ error: "Secret not found" }, { status: 404 });
      }
      return NextResponse.json(secret);
    }

    const secrets = await getAllSecrets(userId);
    return NextResponse.json(secrets);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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

    if (isCloud()) {
      if (action === "setup") {
        if (!body.salt || !body.verificationHash) {
          return NextResponse.json(
            {
              error:
                "Cloud vault setup requires client-derived salt + verificationHash",
            },
            { status: 400 },
          );
        }
        await setupCloudVault(userId, body.salt, body.verificationHash);
        return NextResponse.json({ success: true });
      }

      if (action === "unlock" || action === "lock") {
        // Cloud unlock/lock is purely client-side. The server doesn't have
        // the key to validate or hold. We accept the call as a no-op so the
        // existing UI doesn't break.
        return NextResponse.json({ success: true });
      }

      if (
        body.encryptedValue === undefined ||
        body.nonce === undefined ||
        !body.name
      ) {
        return NextResponse.json(
          { error: "Cloud secrets require encryptedValue + nonce + name" },
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
    }

    if (action === "setup") {
      await setupVault(body.password, body.storagePath, userId);
      return NextResponse.json({ success: true });
    }

    if (action === "unlock") {
      const success = await unlockVault(body.password, userId);
      if (!success) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 },
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "lock") {
      lockVault(userId);
      return NextResponse.json({ success: true });
    }

    const secret = await createSecret(
      {
        name: body.name,
        value: body.value,
        category: body.category,
        notes: body.notes,
        tags: body.tags,
      },
      userId,
    );
    return NextResponse.json(secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const body = await req.json();

    if (isCloud()) {
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
    }

    const result = await updateSecret(
      {
        id: body.id,
        name: body.name,
        value: body.value,
        category: body.category,
        notes: body.notes,
        tags: body.tags,
      },
      userId,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
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
    if (isCloud()) {
      await deleteCloudSecret(id, userId);
    } else {
      await deleteSecret(id, userId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
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
      if (isCloud()) {
        if (!body.newSalt || !body.newVerificationHash) {
          return NextResponse.json(
            {
              error:
                "Cloud password rotation requires client-derived salt + hash",
            },
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

      const success = await changePassword(
        body.currentPassword,
        body.newPassword,
        userId,
      );
      if (!success) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 },
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "change-path") {
      if (isCloud()) {
        return NextResponse.json(
          { error: "Storage path is not configurable in cloud mode" },
          { status: 400 },
        );
      }
      changeVaultPath(body.newPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
