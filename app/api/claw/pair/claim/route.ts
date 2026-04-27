/**
 * POST /api/claw/pair/claim   (UNAUTHENTICATED — keyed by 6-digit code)
 *
 * Called by `npx lobsterd pair <code>` running on the user's machine.
 *
 *   Body: { code, lobsterId, publicKey, hostname?, port? }
 *
 *   On success:
 *     - Marks the pairing row as consumed (single-use).
 *     - Mints a long-lived `agent_jwt` (30 days, role="agent") so lobsterd
 *       can dial the relay.
 *     - Provisions a `claw_connections` row for the user with
 *       transport="relay" and the agent's pairing token attached.
 *
 *   Returns: { connectionId, agentJwt, relayUrl, pairingToken }
 *
 * The endpoint is unauthenticated because lobsterd has no Supabase
 * session yet — instead, the 6-digit code is the (short-lived, single-use)
 * shared secret. The cloud UI requires the user to be logged in to mint
 * codes, so a leaked code only burns the pairing for that one user.
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { and, eq } from "drizzle-orm";

import { isCloud } from "@/lib/core/runtime";
import { getDb } from "@/lib/db";
import { clawPairings, clawConnections } from "@/lib/db/schema/sqlite/claw";

const AGENT_JWT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface ClaimBody {
  code?: string;
  lobsterId?: string;
  publicKey?: string;
  hostname?: string;
  port?: number;
}

export async function POST(req: NextRequest) {
  if (!isCloud()) {
    return NextResponse.json(
      { error: "Pairing is cloud-only." },
      { status: 410 },
    );
  }

  const secret = process.env.RELAY_JWT_SECRET;
  const relayBase = process.env.RELAY_PUBLIC_URL;
  if (!secret || !relayBase) {
    return NextResponse.json(
      {
        error:
          "Relay is not configured. Set RELAY_JWT_SECRET and RELAY_PUBLIC_URL.",
      },
      { status: 503 },
    );
  }

  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const lobsterId = (body.lobsterId ?? "").trim();
  const publicKey = (body.publicKey ?? "").trim();
  if (!code || !lobsterId || !publicKey) {
    return NextResponse.json(
      { error: "code, lobsterId and publicKey are required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const pairingRows = await db
    .select()
    .from(clawPairings)
    .where(eq(clawPairings.code, code))
    .limit(1);
  const pairing = pairingRows[0];

  const now = Date.now();
  if (!pairing) {
    return NextResponse.json({ error: "Unknown code" }, { status: 404 });
  }
  if (pairing.consumedAt) {
    return NextResponse.json(
      { error: "Code already used" },
      { status: 409 },
    );
  }
  if (Number(pairing.expiresAt) < now) {
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }

  // Pairing token is the relay-room key; stable for the lifetime of the
  // connection. Generated server-side so neither side can forge it.
  const pairingToken = randomBytes(16).toString("hex");
  const connectionId = nanoid();

  const nowSec = Math.floor(now / 1000);
  const exp = nowSec + AGENT_JWT_TTL_SECONDS;

  const agentJwt = await new SignJWT({
    userId: pairing.userId,
    pairingToken,
    role: "agent",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(nowSec)
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));

  const relayUrl = `${relayBase.replace(/\/$/, "")}/pair/${pairingToken}`;

  // Mark code consumed.
  await db
    .update(clawPairings)
    .set({ consumedAt: now, lobsterId, agentJwt })
    .where(
      and(
        eq(clawPairings.code, code),
        eq(clawPairings.userId, pairing.userId),
      ),
    );

  // Provision the connection row pointing at the relay.
  await db.insert(clawConnections).values({
    id: connectionId,
    userId: pairing.userId,
    name: body.hostname || lobsterId,
    host: body.hostname || lobsterId,
    port: body.port ?? 22,
    username: "agent",
    authMethod: "key",
    gatewayPort: 18789,
    isDefault: false,
    transport: "relay",
    pairingCode: pairingToken,
    pairingExpiresAt: exp * 1000,
    agentJwt,
    relayUrl,
    publicKey,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    connectionId,
    agentJwt,
    relayUrl: `${relayUrl}?token=${agentJwt}`,
    pairingToken,
  });
}
