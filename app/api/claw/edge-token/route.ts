/**
 * POST /api/claw/edge-token
 *
 * Mints a short-lived (60 s) HS256 JWT scoped to a single
 * `claw_connections` row, used by the browser to open a WebSocket against
 * the Cloudflare Worker `/dial/:connectionId` route. The Worker uses the
 * JWT's `host`/`port` fields to decide where to open the TCP socket — it
 * NEVER trusts the client to provide them via the URL.
 *
 * Body:  { connectionId: string }
 * Returns: { token, connectionId, host, port, expiresAt, dialUrl }
 *
 * Cloud-only — the local install talks to ssh2 directly. The connection
 * row must have `transport === "edge"`; reject anything else so a relay
 * row can't be reused as a dial token.
 */

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { and, eq } from "drizzle-orm";

import { isCloud } from "@/lib/core/runtime";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDb } from "@/lib/db";
import { clawConnections } from "@/lib/db/schema/sqlite/claw";

const TOKEN_TTL_SECONDS = 60;

export async function POST(req: NextRequest) {
  if (!isCloud()) {
    return NextResponse.json(
      {
        error:
          "Edge dial tokens are cloud-only. Local installs talk to lobsters via ssh2.",
      },
      { status: 410 },
    );
  }

  const secret = process.env.RELAY_JWT_SECRET;
  const relayUrlBase = process.env.RELAY_PUBLIC_URL;
  if (!secret || !relayUrlBase) {
    return NextResponse.json(
      {
        error:
          "Relay is not configured. Set RELAY_JWT_SECRET and RELAY_PUBLIC_URL.",
      },
      { status: 503 },
    );
  }

  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let body: { connectionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const conn = await db
    .select({
      id: clawConnections.id,
      host: clawConnections.host,
      port: clawConnections.port,
      transport: clawConnections.transport,
      credentialSecretId: clawConnections.credentialSecretId,
    })
    .from(clawConnections)
    .where(
      and(
        eq(clawConnections.id, body.connectionId),
        eq(clawConnections.userId, auth.userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!conn) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 },
    );
  }
  if (conn.transport !== "edge") {
    return NextResponse.json(
      {
        error:
          "This connection is not configured for the edge transport. Use /api/claw/relay-token for relay connections.",
      },
      { status: 400 },
    );
  }
  if (!conn.credentialSecretId) {
    return NextResponse.json(
      {
        error:
          "Connection is missing a vault credential. Re-add the server in the Claw UI.",
      },
      { status: 409 },
    );
  }

  // Defence-in-depth: catch obviously bad host/port values before we even
  // sign the JWT. The Worker repeats these checks but failing fast here
  // gives a nicer error in the UI.
  if (!conn.host || typeof conn.host !== "string") {
    return NextResponse.json(
      { error: "Connection has no host configured." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(conn.port) || conn.port < 1 || conn.port > 65535) {
    return NextResponse.json(
      { error: "Connection has an invalid port." },
      { status: 400 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const key = new TextEncoder().encode(secret);

  const jwt = await new SignJWT({
    userId: auth.userId,
    connectionId: conn.id,
    host: conn.host,
    port: conn.port,
    role: "tcp-direct",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  const base = relayUrlBase.replace(/\/$/, "");
  return NextResponse.json({
    token: jwt,
    connectionId: conn.id,
    host: conn.host,
    port: conn.port,
    expiresAt: exp,
    dialUrl: `${base}/dial/${conn.id}?token=${jwt}`,
  });
}
