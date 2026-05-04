/**
 * Local-mode SSH transport. Wraps `ssh2` to give claw an exec/SFTP API.
 * This file imports a native module and must NEVER be loaded in cloud mode —
 * the runtime guard at the top throws if MODE !== "local".
 */
import { isLocal } from "@/lib/core/runtime";

if (!isLocal()) {
  throw new Error(
    "[claw/transport-ssh] ssh2 transport is local-only. Use transport-relay in cloud mode.",
  );
}

import { Client, type ConnectConfig, type SFTPWrapper } from "ssh2";
import type { ClawConnection } from "./types";
import { getConnection } from "./actions-db";

const globalKey = "__claw_ssh_connections" as const;
type GlobalWithSSH = typeof globalThis & { [globalKey]?: Map<string, Client> };

function getActiveConnections(): Map<string, Client> {
  const g = globalThis as GlobalWithSSH;
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey];
}

function buildConnectConfig(conn: ClawConnection): ConnectConfig {
  // Keepalive tuned so a half-dead TCP socket dies in roughly 30s (3 missed
  // pings × 10s) instead of sitting in limbo for minutes. ssh2 fires the
  // `error` handler once the count is exceeded, which our `on("error")`
  // handler then uses to evict the connection and clear its queue.
  const config: ConnectConfig = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    readyTimeout: 10000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  if (conn.authMethod === "password" && conn.password) {
    config.password = conn.password;
  } else if (conn.authMethod === "key" && conn.privateKey) {
    config.privateKey = conn.privateKey;
    if (conn.passphrase) {
      config.passphrase = conn.passphrase;
    }
  }

  return config;
}

export function getSSHClient(connectionId: string): Client | undefined {
  return getActiveConnections().get(connectionId);
}

export async function connectSSH(
  connectionId: string,
): Promise<{ success: boolean; error?: string }> {
  const conn = await getConnection(connectionId);
  if (!conn) return { success: false, error: "Connection not found" };

  const conns = getActiveConnections();
  const existing = conns.get(connectionId);
  if (existing) {
    existing.end();
    conns.delete(connectionId);
  }
  // Drop any lambdas still queued against the dead client so they don't
  // throw `Not connected` when their turn comes around. Each queued lambda
  // re-fetches the live client itself (see `executeCommand`), but resetting
  // the queue here avoids a long stale-command tail.
  getQueue().delete(connectionId);

  return new Promise((resolve) => {
    const client = new Client();
    const config = buildConnectConfig(conn);

    client.on("ready", () => {
      getActiveConnections().set(connectionId, client);
      resolve({ success: true });
    });

    client.on("error", (err) => {
      getActiveConnections().delete(connectionId);
      getQueue().delete(connectionId);
      resolve({ success: false, error: err.message });
    });

    client.on("close", () => {
      getActiveConnections().delete(connectionId);
      getQueue().delete(connectionId);
    });

    try {
      client.connect(config);
    } catch (err) {
      resolve({
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to initiate connection",
      });
    }
  });
}

export function disconnectSSH(connectionId: string): void {
  const conns = getActiveConnections();
  const client = conns.get(connectionId);
  if (client) {
    client.end();
    conns.delete(connectionId);
  }
  getQueue().delete(connectionId);
}

export function isSSHConnected(connectionId: string): boolean {
  return getActiveConnections().has(connectionId);
}

/**
 * Wraps a command in a login shell so PATH from ~/.profile, ~/.bashrc, nvm,
 * etc. is loaded. ssh2's exec() spawns a bare non-interactive shell by
 * default, which doesn't source login profiles.
 */
function loginShell(command: string): string {
  const escaped = command.replace(/'/g, "'\\''");
  return `bash -lc '${escaped}'`;
}

const queueKey = "__claw_ssh_queues" as const;
type GlobalWithQueues = typeof globalThis & {
  [queueKey]?: Map<string, Promise<unknown>>;
};

function getQueue(): Map<string, Promise<unknown>> {
  const g = globalThis as GlobalWithQueues;
  if (!g[queueKey]) {
    g[queueKey] = new Map();
  }
  return g[queueKey];
}

function enqueue<T>(connectionId: string, fn: () => Promise<T>): Promise<T> {
  const queues = getQueue();
  const prev = queues.get(connectionId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(connectionId, next);
  // The cleanup chain swallows both outcomes so it never surfaces as a
  // duplicate `unhandledRejection` — the actual rejection is delivered to
  // the caller via the returned `next` promise, which they handle.
  const cleanup = () => {
    if (queues.get(connectionId) === next) {
      queues.delete(connectionId);
    }
  };
  next.then(cleanup, cleanup);
  return next;
}

function execOnClient(
  client: Client,
  command: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // ssh2's Client.exec throws synchronously with `Not connected` when the
    // underlying socket is dead — wrap so we always clear the timer and
    // convert the throw to a clean rejection instead of leaving the timer
    // hanging on the event loop for `timeoutMs`.
    try {
      client.exec(loginShell(command), (err, stream) => {
        if (err) {
          clearTimeout(timer);
          reject(err);
          return;
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("close", (code: number) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, code: code ?? 0 });
        });
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function executeCommand(
  connectionId: string,
  command: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  // Fast-fail at call time so unconnected callers don't even queue.
  if (!getActiveConnections().has(connectionId)) {
    throw new Error("Not connected");
  }
  // Re-resolve the live client inside the queued lambda. If the connection
  // dropped between enqueue and dequeue (the common case behind the storm
  // of `Not connected` errors after a stale session), this fast-fails
  // instead of running against a captured-but-dead handle.
  return enqueue(connectionId, () => {
    const live = getActiveConnections().get(connectionId);
    if (!live) {
      return Promise.reject(new Error("Not connected"));
    }
    return execOnClient(live, command, timeoutMs);
  });
}

export async function executeOpenClawCommand(
  connectionId: string,
  subcommand: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return executeCommand(connectionId, `openclaw ${subcommand}`, timeoutMs);
}

/**
 * Short liveness probe that proves the SSH tunnel itself can still execute
 * commands. ssh2 sometimes reports a connection as live well after the
 * underlying TCP socket has died (until keepalive trips), and a half-dead
 * tunnel is the most common cause of "openclaw command hung for 15s →
 * 500" symptoms upstream.
 *
 * IMPORTANT: this probe bypasses the per-connection command queue. If we
 * enqueued it, a single hung `openclaw status` call would pin every
 * caller behind it for 30s before their own 3s ping budget even starts
 * counting — exactly the "everything is slow for 30-45s after connect"
 * symptom the UI was hitting. Running on a sibling ssh2 exec channel
 * keeps the probe independent from whatever blocks the queue, so we can
 * evict a dead client in real time instead of amortising the discovery
 * across N piled-up requests.
 *
 * On failure (or timeout), the SSH client is evicted and its queue cleared
 * so the next call fast-fails with a clean `Not connected` instead of
 * silently inheriting the dead handle. Callers should treat a `false`
 * return as "the user must reconnect" — the caller can then surface a
 * `reconnectRequired` flag to the UI.
 */
export async function pingConnection(
  connectionId: string,
  timeoutMs = 3000,
): Promise<boolean> {
  const client = getActiveConnections().get(connectionId);
  if (!client) return false;

  const evict = () => {
    const c = getActiveConnections().get(connectionId);
    if (c) {
      try { c.end(); } catch { /* socket already gone */ }
      getActiveConnections().delete(connectionId);
    }
    getQueue().delete(connectionId);
  };

  try {
    // Run directly against the ssh2 client so we never share a slot with
    // whatever command is currently occupying the queue. ssh2 multiplexes
    // exec requests into separate channels on the same SSH connection, so
    // this is safe and adds only a tiny, per-probe overhead.
    const res = await execOnClient(client, "echo PING", timeoutMs);
    const ok = res.code === 0 && res.stdout.includes("PING");
    if (!ok) evict();
    return ok;
  } catch {
    evict();
    return false;
  }
}

export function getSFTP(connectionId: string): Promise<SFTPWrapper> {
  const client = getActiveConnections().get(connectionId);
  if (!client) throw new Error("Not connected");
  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) return reject(err);
      resolve(sftp);
    });
  });
}

export async function resolveAgentId(
  connectionId: string,
): Promise<string | null> {
  const result = await executeOpenClawCommand(
    connectionId,
    "sessions --all-agents --json",
    15000,
  );
  if (result.code !== 0) return null;

  try {
    const data = JSON.parse(result.stdout.trim());
    const sessions: { agentId?: string }[] = data.sessions ?? [];
    if (sessions.length > 0 && sessions[0].agentId) {
      return sessions[0].agentId;
    }
    const stores: { agentId?: string }[] = data.stores ?? [];
    if (stores.length > 0 && stores[0].agentId) {
      return stores[0].agentId;
    }
  } catch {
    // parse failed
  }

  const cfgResult = await executeCommand(
    connectionId,
    'cat ~/.openclaw/openclaw.json 2>/dev/null | grep -o \'"defaultAgent"[[:space:]]*:[[:space:]]*"[^"]*"\' | head -1 | sed \'s/.*"\\([^"]*\\)"$/\\1/\'',
    5000,
  );
  if (cfgResult.code === 0 && cfgResult.stdout.trim()) {
    return cfgResult.stdout.trim();
  }

  return null;
}

export { loginShell };
