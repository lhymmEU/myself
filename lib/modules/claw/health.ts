/**
 * Connection-health helpers used by the Claw API routes.
 *
 * The transport layer can tell us whether an SSH client is in the active
 * connections map, but a presence check alone is not enough: ssh2 keeps a
 * client live until keepalive trips, so a TCP socket that died mid-session
 * still appears connected. Routes that hit the remote — sessions list, DM
 * exec, etc. — would otherwise hang their full timeout (10–30 seconds)
 * before giving up.
 *
 * `preflight` does a short `echo PING` over the tunnel. On failure the SSH
 * client is evicted by `pingConnection` itself, so subsequent calls
 * fast-fail with `Not connected`. Routes use the result to surface a
 * `reconnectRequired` flag to the UI, which can then auto-reconnect.
 *
 * `agentFingerprint` tracks the set of agentIds last seen for a given
 * connection. When openclaw is reinitialized on the remote, the set
 * changes, and routes can include `agentsChanged: true` in the response so
 * the client knows to drop any locally cached agentId/sessionId.
 */
import { isSSHConnected, pingConnection } from "./actions";

export type PreflightResult =
  | { ok: true }
  | { ok: false; status: number; body: PreflightErrorBody };

export interface PreflightErrorBody {
  error: string;
  /** Hint to the client: hit /api/claw/connect to re-establish the tunnel. */
  reconnectRequired?: boolean;
}

/**
 * Verifies the SSH/relay tunnel is alive. The `quick` mode skips the
 * round-trip ping when callers only need basic presence (e.g. polling
 * status endpoints that already use short timeouts).
 */
export async function preflight(
  connectionId: string,
  options?: { skipPing?: boolean; timeoutMs?: number },
): Promise<PreflightResult> {
  if (!isSSHConnected(connectionId)) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Not connected via SSH",
        reconnectRequired: true,
      },
    };
  }

  if (options?.skipPing) return { ok: true };

  const alive = await pingConnection(
    connectionId,
    options?.timeoutMs ?? 3000,
  );
  if (!alive) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Connection appears dead — please reconnect",
        reconnectRequired: true,
      },
    };
  }

  return { ok: true };
}

const fingerprintKey = "__claw_agent_fingerprint" as const;
type GlobalWithFingerprints = typeof globalThis & {
  [fingerprintKey]?: Map<string, string>;
};

function getFingerprintStore(): Map<string, string> {
  const g = globalThis as GlobalWithFingerprints;
  if (!g[fingerprintKey]) {
    g[fingerprintKey] = new Map();
  }
  return g[fingerprintKey];
}

function fingerprintFromAgents(agentIds: string[]): string {
  return [...new Set(agentIds.filter(Boolean))].sort().join(",");
}

/**
 * Compares the current set of remote agentIds against the last known set
 * for this connection. Returns `true` (and persists the new fingerprint)
 * when the remote was clearly reinitialised — e.g. all old agents are
 * gone, or a brand-new id has appeared.
 */
export function detectAgentChange(
  connectionId: string,
  agentIds: string[],
): boolean {
  const store = getFingerprintStore();
  const next = fingerprintFromAgents(agentIds);
  const prev = store.get(connectionId);
  store.set(connectionId, next);

  if (prev === undefined) return false;
  return prev !== next;
}

