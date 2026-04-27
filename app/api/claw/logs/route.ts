import { NextRequest } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getSSHClient,
  isSSHConnected,
  getDefaultConnection,
  loginShell,
} from "@/lib/modules/claw/actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const connectionId =
    req.nextUrl.searchParams.get("connectionId") ?? getDefaultConnection(auth.userId)?.id;

  if (!connectionId) {
    return new Response("No connection configured", { status: 400 });
  }
  if (!isSSHConnected(connectionId)) {
    return new Response("Not connected via SSH", { status: 400 });
  }

  const client = getSSHClient(connectionId);
  if (!client) {
    return new Response("SSH client not available", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      client.exec(loginShell("openclaw logs --follow --json 2>&1"), (err, sshStream) => {
        if (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
          return;
        }

        sshStream.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n").filter(Boolean);
          for (const line of lines) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          }
        });

        sshStream.stderr.on("data", (data: Buffer) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: data.toString() })}\n\n`
            )
          );
        });

        sshStream.on("close", () => {
          controller.enqueue(encoder.encode("data: {\"done\":true}\n\n"));
          controller.close();
        });

        req.signal.addEventListener("abort", () => {
          sshStream.close();
        });
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
