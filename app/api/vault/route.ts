import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
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

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");

    if (action === "status") {
      return NextResponse.json(getVaultStatus());
    }

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const secret = getSecret(id);
      if (!secret) {
        return NextResponse.json({ error: "Secret not found" }, { status: 404 });
      }
      return NextResponse.json(secret);
    }

    const secrets = getAllSecrets();
    return NextResponse.json(secrets);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    const body = await req.json();

    if (action === "setup") {
      setupVault(body.password, body.storagePath);
      return NextResponse.json({ success: true });
    }

    if (action === "unlock") {
      const success = unlockVault(body.password);
      if (!success) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "lock") {
      lockVault();
      return NextResponse.json({ success: true });
    }

    const secret = createSecret({
      name: body.name,
      value: body.value,
      category: body.category,
      notes: body.notes,
      tags: body.tags,
    });
    return NextResponse.json(secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const result = updateSecret({
      id: body.id,
      name: body.name,
      value: body.value,
      category: body.category,
      notes: body.notes,
      tags: body.tags,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    deleteSecret(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Vault is locked" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    const body = await req.json();

    if (action === "change-password") {
      const success = changePassword(body.currentPassword, body.newPassword);
      if (!success) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "change-path") {
      changeVaultPath(body.newPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
