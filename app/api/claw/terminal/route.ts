import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { isLocal } from "@/lib/core/runtime";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getSSHClient,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import type { ClientChannel } from "ssh2";

interface ShellSession {
  stream: ClientChannel;
  buffer: string[];
  createdAt: number;
}

const shellSessions = new Map<string, ShellSession>();

function getOrCreateSessionId(connectionId: string): string {
  return `shell-${connectionId}`;
}

export async function POST(req: NextRequest) {
  bootApp();
  if (!isLocal()) {
    return NextResponse.json(
      {
        error:
          "Interactive terminal is only available in local installs. Cloud users should pair a lobsterd agent and use the relay terminal once it ships.",
      },
      { status: 501 },
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { connectionId: cid, action, input, cols, rows } = await req.json();
    const connectionId = cid ?? getDefaultConnection(auth.userId)?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const sessionId = getOrCreateSessionId(connectionId);

    if (action === "open") {
      const existing = shellSessions.get(sessionId);
      if (existing) {
        existing.stream.close();
        shellSessions.delete(sessionId);
      }

      const client = getSSHClient(connectionId);
      if (!client) {
        return NextResponse.json({ error: "SSH client not found" }, { status: 400 });
      }

      return new Promise<NextResponse>((resolve) => {
        client.shell(
          { term: "xterm-256color", cols: cols ?? 120, rows: rows ?? 30 },
          (err, stream) => {
            if (err) {
              resolve(
                NextResponse.json({ error: err.message }, { status: 500 })
              );
              return;
            }

            const session: ShellSession = {
              stream,
              buffer: [],
              createdAt: Date.now(),
            };

            stream.on("data", (data: Buffer) => {
              session.buffer.push(data.toString("base64"));
              if (session.buffer.length > 5000) {
                session.buffer = session.buffer.slice(-2500);
              }
            });

            stream.on("close", () => {
              shellSessions.delete(sessionId);
            });

            shellSessions.set(sessionId, session);

            resolve(NextResponse.json({ sessionId, status: "open" }));
          }
        );
      });
    }

    if (action === "write") {
      const session = shellSessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: "No shell session" }, { status: 400 });
      }
      session.stream.write(input);
      return NextResponse.json({ ok: true });
    }

    if (action === "read") {
      const session = shellSessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: "No shell session", closed: true }, { status: 400 });
      }
      const data = session.buffer.splice(0);
      return NextResponse.json({ data });
    }

    if (action === "resize") {
      const session = shellSessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: "No shell session" }, { status: 400 });
      }
      session.stream.setWindow(rows ?? 30, cols ?? 120, 0, 0);
      return NextResponse.json({ ok: true });
    }

    if (action === "close") {
      const session = shellSessions.get(sessionId);
      if (session) {
        session.stream.close();
        shellSessions.delete(sessionId);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
