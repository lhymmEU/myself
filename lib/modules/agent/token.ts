import { randomUUID, createHash } from "node:crypto";
import { SignJWT } from "jose";

const TEN_YEARS_S = 10 * 365 * 24 * 60 * 60;

function getJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET ?? "";
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET not configured. Copy it from Supabase Project Settings → API → JWT Settings.",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface IssuedAgentToken {
  /** Plaintext JWT to display to the user once. */
  token: string;
  /** JWT identifier — store this in agent_registrations for revocation. */
  jti: string;
  /** Issued-at, ms since epoch. */
  issuedAt: number;
}

/**
 * Sign a long-lived JWT that the agent CLI uses as its Supabase access token.
 * Includes the standard Supabase claims (sub, role, aud) so Supabase Realtime
 * and RLS accept it as a regular authenticated user session.
 *
 * The plaintext token is returned to the caller, which is expected to show it
 * to the user exactly once and store only the `jti` for revocation.
 */
export async function issueAgentToken(userId: string): Promise<IssuedAgentToken> {
  const jti = randomUUID();
  const issuedAt = Date.now();

  const token = await new SignJWT({
    role: "authenticated",
    agent: true,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setAudience("authenticated")
    .setJti(jti)
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(Math.floor(issuedAt / 1000) + TEN_YEARS_S)
    .sign(getJwtSecret());

  return { token, jti, issuedAt };
}

export function hashJti(jti: string): string {
  return createHash("sha256").update(jti).digest("hex");
}
