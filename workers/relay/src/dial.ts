/**
 * `/dial/:connectionId` — opens a raw TCP socket to the user's cloud SSH
 * server and pipes bytes between it and the requesting WebSocket.
 *
 * Auth: short-lived HS256 JWT minted by Vercel
 *   { userId, connectionId, host, port, role: "tcp-direct", exp }
 *
 * Flow:
 *   1. Verify JWT, match path, check origin allow-list.
 *   2. Reject blocked ports + resolve host via DoH; reject private/reserved
 *      IPs (RFC1918, loopback, link-local, cloud metadata).
 *   3. Upgrade the WebSocket. `connect()` from `cloudflare:sockets` opens
 *      the TCP socket. We send a `ready` control frame on `socket.opened`.
 *   4. Pump bytes:
 *        WS  binary frames → socket.writable
 *        socket.readable    → WS  binary frames
 *      Control frames are reserved for status (`ready`, `tcp_closed`,
 *      `tcp_error:<msg>`) — text frames from the client are ignored.
 *   5. Either end closing tears the other side down.
 *
 * The Worker only ever sees ciphertext: SSH key exchange and authentication
 * happen inside `gossh-wasm` in the browser and `sshd` on the user's box.
 */

import { connect } from "cloudflare:sockets";
import { jwtVerify } from "jose";
import type { Env } from "./index";
import { isBlockedPort, resolveSafeAddress } from "./safety";

interface DialClaims {
  userId: string;
  connectionId: string;
  host: string;
  port: number;
  role: "tcp-direct";
  exp: number;
}

const CONTROL_PREFIX = "\u0001ctrl:";

function controlFrame(message: string): string {
  return `${CONTROL_PREFIX}${message}`;
}

function isOriginAllowed(origin: string | null, list: string): boolean {
  if (!list.trim()) return true;
  if (!origin) return false;
  const allowed = list.split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}

async function verifyDialJwt(
  token: string,
  secret: string,
): Promise<DialClaims | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId === "string" &&
      typeof payload.connectionId === "string" &&
      typeof payload.host === "string" &&
      typeof payload.port === "number" &&
      payload.role === "tcp-direct" &&
      typeof payload.exp === "number"
    ) {
      return {
        userId: payload.userId,
        connectionId: payload.connectionId,
        host: payload.host,
        port: payload.port,
        role: "tcp-direct",
        exp: payload.exp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function handleDial(
  request: Request,
  env: Env,
  connectionIdInPath: string,
): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const url = new URL(request.url);
  const tok =
    url.searchParams.get("token") ||
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!tok) {
    return new Response("Missing dial token", { status: 401 });
  }

  const claims = await verifyDialJwt(tok, env.RELAY_JWT_SECRET);
  if (!claims) {
    return new Response("Invalid or expired dial token", { status: 401 });
  }
  if (claims.connectionId !== connectionIdInPath) {
    return new Response("Token does not match path", { status: 403 });
  }

  if (
    !isOriginAllowed(
      request.headers.get("Origin"),
      env.ALLOWED_BROWSER_ORIGINS ?? "",
    )
  ) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (isBlockedPort(claims.port)) {
    return new Response(`Port ${claims.port} is blocked`, { status: 403 });
  }

  const resolved = await resolveSafeAddress(claims.host);
  if (!resolved.ok) {
    return new Response(`Unsafe target: ${resolved.reason}`, { status: 403 });
  }

  // Per-user concurrency guard. Acquire a slot before upgrading the
  // WebSocket so a rejected request never opens a TCP socket.
  const limiterId = env.DIAL_LIMITER.idFromName(claims.userId);
  const limiterStub = env.DIAL_LIMITER.get(limiterId);
  const acquireRes = await limiterStub.fetch(
    new Request("https://limiter/acquire", { method: "POST" }),
  );
  if (acquireRes.status === 429) {
    return new Response(await acquireRes.text(), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!acquireRes.ok) {
    return new Response("Rate-limit unavailable", { status: 503 });
  }

  let limiterReleased = false;
  const releaseLimiter = () => {
    if (limiterReleased) return;
    limiterReleased = true;
    void limiterStub
      .fetch(new Request("https://limiter/release", { method: "POST" }))
      .catch(() => {});
  };

  // All checks passed — upgrade and start bridging.
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();

  // For IPv6 hand `connect()` a bracketed literal; `cloudflare:sockets`
  // accepts the SocketAddress shape directly so we can pass an explicit
  // hostname/port pair regardless.
  const tcpHost =
    resolved.family === "ipv6" ? `[${resolved.address}]` : resolved.address;

  let socket: ReturnType<typeof connect>;
  try {
    socket = connect(
      { hostname: tcpHost, port: claims.port },
      { secureTransport: "off", allowHalfOpen: true },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      server.send(controlFrame(`tcp_error:${msg}`));
    } catch {
      // socket already gone
    }
    try {
      server.close(1011, "TCP connect failed");
    } catch {
      // ignored
    }
    releaseLimiter();
    return new Response(null, { status: 101, webSocket: client });
  }

  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  let teardown = false;

  const closeAll = (reason: string) => {
    if (teardown) return;
    teardown = true;
    if (writer) {
      try {
        writer.close().catch(() => {});
      } catch {
        // ignored
      }
    }
    try {
      socket.close().catch(() => {});
    } catch {
      // ignored
    }
    try {
      server.close(1000, reason);
    } catch {
      // ignored
    }
    releaseLimiter();
  };

  socket.opened
    .then(() => {
      try {
        server.send(controlFrame("ready"));
      } catch {
        // ignored
      }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        server.send(controlFrame(`tcp_error:${msg}`));
      } catch {
        // ignored
      }
      closeAll("TCP open failed");
    });

  try {
    writer = socket.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      server.send(controlFrame(`tcp_error:${msg}`));
    } catch {
      // ignored
    }
    closeAll("writer init failed");
    return new Response(null, { status: 101, webSocket: client });
  }

  // WS → TCP. Binary frames are forwarded; string frames are ignored
  // (control protocol is reserved for the server side here).
  server.addEventListener("message", async (ev) => {
    if (teardown || !writer) return;
    const data = (ev as MessageEvent).data;
    if (typeof data === "string") return;
    try {
      const buf = data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array((data as ArrayBufferView).buffer);
      await writer.write(buf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        server.send(controlFrame(`tcp_error:${msg}`));
      } catch {
        // ignored
      }
      closeAll("write failed");
    }
  });

  // TCP → WS. Long-running pump; finishes when sshd hangs up or we tear
  // down. We do NOT await this in the response path — Workers keeps the
  // promise alive until the WS closes.
  (async () => {
    try {
      const reader = socket.readable.getReader();
      while (!teardown) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          try {
            server.send(value);
          } catch {
            break;
          }
        }
      }
    } catch {
      // socket errored — fall through to close.
    } finally {
      try {
        server.send(controlFrame("tcp_closed"));
      } catch {
        // ignored
      }
      closeAll("TCP closed");
    }
  })();

  server.addEventListener("close", () => closeAll("client closed"));
  server.addEventListener("error", () => closeAll("client errored"));

  return new Response(null, { status: 101, webSocket: client });
}
