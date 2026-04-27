/**
 * Cloudflare Worker entry point for the lobster relay.
 *
 * Routes:
 *   GET /pair/:token?role=agent|browser  → upgrade to WebSocket and forward
 *                                          into the per-token Durable Object
 *                                          (lobsterd ↔ browser bridge).
 *   GET /dial/:connectionId              → upgrade to WebSocket and pipe
 *                                          bytes between it and a freshly
 *                                          opened TCP socket to the user's
 *                                          cloud SSH server (Flavor A).
 *   GET /health                          → liveness probe.
 *
 * Auth: a short-lived JWT (HS256) signed by Vercel is required as a
 * `?token=` query param OR `Authorization: Bearer …` header.
 *   - `/pair/:token` JWT: { userId, pairingToken, role: "agent"|"browser", exp }
 *   - `/dial/:id`    JWT: { userId, connectionId, host, port, role: "tcp-direct", exp }
 *
 * NOTE: This worker NEVER decrypts payload bytes. For `/pair` it shovels
 * frames between the two paired peers; for `/dial` it shovels bytes between
 * the WebSocket and the TCP socket — SSH negotiation/auth happens in the
 * browser (gossh-wasm) and on the user's sshd.
 */

import { jwtVerify } from "jose";
import { handleDial } from "./dial";

export interface Env {
  RELAY_ROOM: DurableObjectNamespace;
  DIAL_LIMITER: DurableObjectNamespace;
  RELAY_JWT_SECRET: string;
  ALLOWED_BROWSER_ORIGINS?: string;
  /** Per-user concurrent /dial session cap. Defaults to 5 in DialLimiter. */
  DIAL_MAX_CONCURRENT_PER_USER?: string;
}

interface RelayClaims {
  userId: string;
  pairingToken: string;
  role: "agent" | "browser";
  exp: number;
}

async function verifyJwt(
  token: string,
  secret: string,
): Promise<RelayClaims | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId === "string" &&
      typeof payload.pairingToken === "string" &&
      (payload.role === "agent" || payload.role === "browser") &&
      typeof payload.exp === "number"
    ) {
      return {
        userId: payload.userId,
        pairingToken: payload.pairingToken,
        role: payload.role,
        exp: payload.exp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function isOriginAllowed(origin: string | null, list: string): boolean {
  if (!list.trim()) return true;
  if (!origin) return false;
  const allowed = list.split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // Edge transport (Flavor A) — direct TCP bridge to a cloud SSH server.
    // Connection IDs are user-generated row IDs; we don't constrain the
    // shape beyond a length sanity check to keep paths bounded.
    const dialMatch = url.pathname.match(/^\/dial\/([A-Za-z0-9_-]{8,128})$/);
    if (dialMatch) {
      return handleDial(request, env, dialMatch[1]!);
    }

    const pairMatch = url.pathname.match(/^\/pair\/([a-f0-9]{32,})$/i);
    if (!pairMatch) {
      return new Response("Not Found", { status: 404 });
    }
    const pairingTokenInPath = pairMatch[1];

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const auth =
      url.searchParams.get("token") ||
      request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
      "";
    if (!auth) {
      return new Response("Missing relay token", { status: 401 });
    }

    const claims = await verifyJwt(auth, env.RELAY_JWT_SECRET);
    if (!claims) {
      return new Response("Invalid or expired relay token", { status: 401 });
    }

    if (claims.pairingToken !== pairingTokenInPath) {
      return new Response("Token does not match path", { status: 403 });
    }

    if (
      claims.role === "browser" &&
      !isOriginAllowed(
        request.headers.get("Origin"),
        env.ALLOWED_BROWSER_ORIGINS ?? "",
      )
    ) {
      return new Response("Origin not allowed", { status: 403 });
    }

    const id = env.RELAY_ROOM.idFromName(claims.pairingToken);
    const stub = env.RELAY_ROOM.get(id);

    // Forward to the DO with role/userId headers. The DO is private to this
    // worker (no route mapping), so we can trust headers added here.
    const forwarded = new Request(request, request);
    forwarded.headers.set("X-Relay-Role", claims.role);
    forwarded.headers.set("X-Relay-User", claims.userId);
    forwarded.headers.set("X-Relay-Pairing", claims.pairingToken);
    return stub.fetch(forwarded);
  },
};

export { RelayRoom } from "./room";
export { DialLimiter } from "./limiter";
