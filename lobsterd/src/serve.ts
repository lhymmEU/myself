/**
 * `lobsterd serve`
 *
 * Opens an outbound WSS to the relay and pipes traffic between the relay
 * peer (the browser-side terminal) and a local TCP socket on
 * `127.0.0.1:22` (or whatever sshd port the user configured).
 *
 * Reconnect strategy: exponential backoff up to 30 s, with jitter. The
 * agent JWT is valid for 30 days; if the relay returns 401 we exit with a
 * helpful "re-pair" message.
 *
 * Note: this does NOT yet implement the noise/x25519 handshake — that
 * lands once the browser bundle exposes its half. For now the relay
 * forwards plaintext SSH bytes; SSH itself is already encrypted, so the
 * worst case is the same as plain `ssh -W` over the relay.
 */

import { connect } from "node:net";
import WebSocket from "ws";

import type { LobsterdConfig } from "./config";

const MAX_BACKOFF_MS = 30_000;

export async function runServe(cfg: LobsterdConfig): Promise<void> {
  let backoff = 1000;
  let stopping = false;

  const cleanup = () => {
    stopping = true;
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  while (!stopping) {
    try {
      await connectOnce(cfg);
      backoff = 1000;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) {
        console.error(
          "Relay rejected agent JWT (token expired or revoked). Re-pair with `lobsterd pair`.",
        );
        process.exit(1);
      }
      console.error(`Relay disconnected: ${msg}. Retrying in ${backoff}ms.`);
      await sleep(backoff + Math.floor(Math.random() * 500));
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }
}

async function connectOnce(cfg: LobsterdConfig): Promise<void> {
  const url = `${cfg.relayUrl.replace(/\/$/, "")}/pair/${cfg.pairingToken}?token=${cfg.agentJwt}`;

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url);

    let sshSocket: ReturnType<typeof connect> | null = null;

    ws.on("open", () => {
      console.log("Connected to relay; waiting for browser peer.");
    });

    ws.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      const buf = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);

      if (!isBinary) {
        const text = buf.toString("utf-8");
        if (text.startsWith("\u0001ctrl:")) {
          handleControl(text.slice("\u0001ctrl:".length), {
            openSsh: () => {
              if (sshSocket) return;
              sshSocket = openSshSocket(cfg, ws, () => {
                sshSocket = null;
              });
            },
          });
          return;
        }
      }

      if (!sshSocket) {
        sshSocket = openSshSocket(cfg, ws, () => {
          sshSocket = null;
        });
      }
      sshSocket.write(buf);
    });

    ws.on("close", (code) => {
      sshSocket?.destroy();
      sshSocket = null;
      if (code === 1000) {
        resolve();
      } else {
        reject(new Error(`closed with code ${code}`));
      }
    });

    ws.on("error", (err) => {
      sshSocket?.destroy();
      sshSocket = null;
      reject(err);
    });
  });
}

function handleControl(
  message: string,
  handlers: { openSsh: () => void },
): void {
  switch (message) {
    case "ready":
      console.log("Browser peer connected; opening local SSH socket.");
      handlers.openSsh();
      break;
    case "waiting_for_peer":
      console.log("Waiting for browser peer.");
      break;
    case "peer_disconnected":
      console.log("Browser peer disconnected.");
      break;
    default:
      console.log(`Relay control: ${message}`);
  }
}

function openSshSocket(
  cfg: LobsterdConfig,
  ws: WebSocket,
  onClose: () => void,
): ReturnType<typeof connect> {
  const socket = connect({ host: cfg.sshHost, port: cfg.sshPort });

  socket.on("data", (chunk) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk);
    }
  });

  socket.on("error", (err) => {
    console.error(`SSH socket error: ${err.message}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1011, "ssh socket error");
    }
    onClose();
  });

  socket.on("close", () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "ssh socket closed");
    }
    onClose();
  });

  return socket;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
