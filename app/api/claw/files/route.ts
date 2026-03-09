import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getSFTP,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

function resolveConnectionId(req: NextRequest): string | null {
  return (
    req.nextUrl.searchParams.get("connectionId") ??
    getDefaultConnection()?.id ??
    null
  );
}

function guard(connectionId: string | null) {
  if (!connectionId)
    return NextResponse.json(
      { error: "No connection configured" },
      { status: 400 }
    );
  if (!isSSHConnected(connectionId))
    return NextResponse.json(
      { error: "Not connected via SSH" },
      { status: 400 }
    );
  return null;
}

function normalizePath(raw: string): string {
  return raw.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

// GET — list directory or download a file
export async function GET(req: NextRequest) {
  bootApp();
  try {
    const connectionId = resolveConnectionId(req);
    const err = guard(connectionId);
    if (err) return err;

    const action = req.nextUrl.searchParams.get("action") ?? "list";
    const rawPath = req.nextUrl.searchParams.get("path") ?? "~";

    const sftp = await getSFTP(connectionId!);

    const resolvedPath: string = await new Promise((resolve, reject) => {
      if (rawPath.startsWith("~")) {
        sftp.realpath(rawPath.replace(/^~/, "."), (e, abs) =>
          e ? reject(e) : resolve(abs)
        );
      } else {
        resolve(normalizePath(rawPath));
      }
    });

    if (action === "list") {
      const entries = await new Promise<
        { name: string; isDir: boolean; size: number; mtime: number }[]
      >((resolve, reject) => {
        sftp.readdir(resolvedPath, (e, list) => {
          if (e) return reject(e);
          resolve(
            list.map((f) => ({
              name: f.filename,
              isDir: f.attrs.isDirectory(),
              size: f.attrs.size,
              mtime: f.attrs.mtime,
            }))
          );
        });
      });

      entries.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      sftp.end();
      return NextResponse.json({ path: resolvedPath, entries });
    }

    if (action === "download") {
      const buf: Buffer = await new Promise((resolve, reject) => {
        sftp.readFile(resolvedPath, (e, data) => {
          if (e) return reject(e);
          resolve(data);
        });
      });
      sftp.end();

      const name = resolvedPath.split("/").pop() ?? "file";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
          "Content-Length": String(buf.length),
        },
      });
    }

    sftp.end();
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST — upload, mkdir, delete, rename
export async function POST(req: NextRequest) {
  bootApp();
  try {
    const formData = await req.formData();
    const connectionId =
      (formData.get("connectionId") as string) ??
      getDefaultConnection()?.id ??
      null;
    const err = guard(connectionId);
    if (err) return err;

    const action = (formData.get("action") as string) ?? "upload";
    const rawPath = (formData.get("path") as string) ?? "";

    const sftp = await getSFTP(connectionId!);

    const resolvedPath: string = await new Promise((resolve, reject) => {
      if (rawPath.startsWith("~")) {
        sftp.realpath(rawPath.replace(/^~/, "."), (e, abs) =>
          e ? reject(e) : resolve(abs)
        );
      } else {
        resolve(normalizePath(rawPath));
      }
    });

    if (action === "upload") {
      const file = formData.get("file") as File | null;
      if (!file) {
        sftp.end();
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const dest = `${resolvedPath}/${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await new Promise<void>((resolve, reject) => {
        sftp.writeFile(dest, buffer, (e) => (e ? reject(e) : resolve()));
      });

      sftp.end();
      return NextResponse.json({ success: true, path: dest });
    }

    if (action === "mkdir") {
      await new Promise<void>((resolve, reject) => {
        sftp.mkdir(resolvedPath, (e) => (e ? reject(e) : resolve()));
      });
      sftp.end();
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const stat = await new Promise<{ isDir: boolean }>((resolve, reject) => {
        sftp.stat(resolvedPath, (e, s) => {
          if (e) return reject(e);
          resolve({ isDir: s.isDirectory() });
        });
      });

      if (stat.isDir) {
        await new Promise<void>((resolve, reject) => {
          sftp.rmdir(resolvedPath, (e) => (e ? reject(e) : resolve()));
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          sftp.unlink(resolvedPath, (e) => (e ? reject(e) : resolve()));
        });
      }

      sftp.end();
      return NextResponse.json({ success: true });
    }

    if (action === "rename") {
      const newPath = (formData.get("newPath") as string) ?? "";
      if (!newPath) {
        sftp.end();
        return NextResponse.json(
          { error: "newPath required" },
          { status: 400 }
        );
      }
      await new Promise<void>((resolve, reject) => {
        sftp.rename(resolvedPath, newPath, (e) =>
          e ? reject(e) : resolve()
        );
      });
      sftp.end();
      return NextResponse.json({ success: true });
    }

    sftp.end();
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
