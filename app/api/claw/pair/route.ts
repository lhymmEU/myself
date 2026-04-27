/**
 * Pairing handshake between the cloud Life Dashboard and a `lobsterd` agent.
 *
 *   POST /api/claw/pair         (authenticated)
 *     Body: { name?: string }
 *     Returns: { code: "123456", expiresAt }
 *
 *     The browser shows the code to the user. They run
 *     `npx lobsterd pair 123456` on the lobster, which calls:
 *
 *   POST /api/claw/pair/claim   (UNAUTHENTICATED — keyed by code)
 *     Body: { code, lobsterId, publicKey, hostname }
 *     Returns: { connectionId, agentJwt, relayUrl, pairingToken }
 *
 *     The code is single-use; consuming it provisions a `claw_connections`
 *     row and a long-lived `agent_jwt` that lobsterd uses to dial the
 *     relay. After that the cloud UI can request short-lived browser JWTs
 *     via /api/claw/relay-token.
 *
 * Local mode disables this endpoint — pairing is only meaningful in cloud
 * deployments.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { isCloud } from "@/lib/core/runtime";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDb } from "@/lib/db";
import { clawPairings } from "@/lib/db/schema/sqlite/claw";

const PAIRING_TTL_MS = 5 * 60 * 1000;

function generateCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function POST(_req: NextRequest) {
  if (!isCloud()) {
    return NextResponse.json(
      { error: "Pairing is cloud-only." },
      { status: 410 },
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const db = getDb();
  const now = Date.now();
  const expiresAt = now + PAIRING_TTL_MS;

  // Try a few times in case of collision (6-digit codes can collide).
  let code: string | null = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateCode();
    const existsRows = await db
      .select({ code: clawPairings.code })
      .from(clawPairings)
      .where(eq(clawPairings.code, candidate))
      .limit(1);
    if (!existsRows[0]) {
      code = candidate;
    }
  }
  if (!code) {
    return NextResponse.json(
      { error: "Could not allocate pairing code, please retry." },
      { status: 503 },
    );
  }

  await db.insert(clawPairings).values({
    code,
    userId: auth.userId,
    lobsterId: "",
    expiresAt,
    createdAt: now,
  });

  return NextResponse.json({ code, expiresAt });
}

export async function GET(_req: NextRequest) {
  if (!isCloud()) {
    return NextResponse.json(
      { error: "Pairing is cloud-only." },
      { status: 410 },
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const db = getDb();
  const now = Date.now();
  const rows = await db
    .select()
    .from(clawPairings)
    .where(and(eq(clawPairings.userId, auth.userId)));

  return NextResponse.json({
    pairings: rows
      .filter((r) => Number(r.expiresAt) > now && !r.consumedAt)
      .map((r) => ({
        code: r.code,
        expiresAt: Number(r.expiresAt),
      })),
  });
}
