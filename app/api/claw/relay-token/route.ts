/**
 * POST /api/claw/relay-token
 *
 * Mints a short-lived (60 s) HS256 JWT that the browser or lobsterd uses to
 * open a WebSocket against the Cloudflare relay
 * (`wss://<RELAY_HOST>/pair/<pairingToken>?token=<jwt>`).
 *
 * Body:
 *   { connectionId: string, role: "agent" | "browser" }
 *
 * The route looks up the connection's `pairingToken` (set during the
 * pairing flow — see Phase 3b-3 / `/api/claw/pair`) and signs a token
 * scoped to {userId, pairingToken, role, exp}. The relay verifies the JWT
 * with the same `RELAY_JWT_SECRET` and refuses to forward bytes for any
 * other pairing.
 *
 * Cloud-only. In local mode this endpoint returns 410 because lobsterd is
 * not needed — the local install talks to ssh2 directly.
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
          "Relay tokens are cloud-only. Local installs talk to lobsters via ssh2.",
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

  let body: { connectionId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = body.role === "agent" || body.role === "browser" ? body.role : null;
  if (!role) {
    return NextResponse.json(
      { error: "role must be 'agent' or 'browser'" },
      { status: 400 },
    );
  }
  if (!body.connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const connRows = await db
    .select({
      id: clawConnections.id,
      pairingCode: clawConnections.pairingCode,
      transport: clawConnections.transport,
    })
    .from(clawConnections)
    .where(
      and(
        eq(clawConnections.id, body.connectionId),
        eq(clawConnections.userId, auth.userId),
      ),
    )
    .limit(1);
  const conn = connRows[0];

  if (!conn) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 },
    );
  }
  if (conn.transport !== "relay") {
    return NextResponse.json(
      {
        error:
          "This connection is not configured for the cloud relay transport.",
      },
      { status: 400 },
    );
  }
  if (!conn.pairingCode) {
    return NextResponse.json(
      {
        error:
          "Connection has not been paired yet. Run `npx lobsterd pair <code>` on the lobster first.",
      },
      { status: 409 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const key = new TextEncoder().encode(secret);

  const jwt = await new SignJWT({
    userId: auth.userId,
    pairingToken: conn.pairingCode,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  return NextResponse.json({
    token: jwt,
    pairingToken: conn.pairingCode,
    role,
    expiresAt: exp,
    relayUrl: `${relayUrlBase.replace(/\/$/, "")}/pair/${conn.pairingCode}?token=${jwt}`,
  });
}
