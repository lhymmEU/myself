import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agentRegistrations } from "@/lib/db/schema/postgres/agent";
import { issueAgentToken, type IssuedAgentToken } from "./token";

export interface RegistrationStatus {
  connected: boolean;
  label: string;
  connectedAt: number | null;
  lastSeenAt: number | null;
}

/**
 * Look up the user's currently-registered agent. Used by the Settings page.
 */
export async function getRegistration(userId: string): Promise<RegistrationStatus> {
  const rows = await getDb()
    .select()
    .from(agentRegistrations)
    .where(eq(agentRegistrations.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { connected: false, label: "", connectedAt: null, lastSeenAt: null };
  }
  return {
    connected: true,
    label: row.label,
    connectedAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
  };
}

/**
 * Rotate the user's agent token: issue a new JWT, replace any existing
 * registration with the new jti. Any previously-paired agent immediately
 * stops working because its `jti` no longer matches the RLS-enforced
 * active jti for this user.
 *
 * Returns the plaintext JWT — show to the user once and never store it.
 */
export async function rotateAgentToken(
  userId: string,
  label: string,
): Promise<IssuedAgentToken> {
  const issued = await issueAgentToken(userId);
  const trimmedLabel = label.trim().slice(0, 64);

  await getDb()
    .insert(agentRegistrations)
    .values({
      userId,
      label: trimmedLabel,
      tokenJti: issued.jti,
      createdAt: issued.issuedAt,
      lastSeenAt: null,
    })
    .onConflictDoUpdate({
      target: agentRegistrations.userId,
      set: {
        label: trimmedLabel,
        tokenJti: issued.jti,
        createdAt: issued.issuedAt,
        lastSeenAt: null,
      },
    });

  return issued;
}

/**
 * Remove the user's agent registration entirely; the paired agent will be
 * blocked by RLS on its next request.
 */
export async function revokeAgent(userId: string): Promise<void> {
  await getDb()
    .delete(agentRegistrations)
    .where(eq(agentRegistrations.userId, userId));
}
