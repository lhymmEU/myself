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
  const config: ConnectConfig = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    readyTimeout: 10000,
    keepaliveInterval: 15000,
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

  return new Promise((resolve) => {
    const client = new Client();
    const config = buildConnectConfig(conn);

    client.on("ready", () => {
      getActiveConnections().set(connectionId, client);
      resolve({ success: true });
    });

    client.on("error", (err) => {
      getActiveConnections().delete(connectionId);
      resolve({ success: false, error: err.message });
    });

    client.on("close", () => {
      getActiveConnections().delete(connectionId);
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
  next.finally(() => {
    if (queues.get(connectionId) === next) {
      queues.delete(connectionId);
    }
  });
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
  });
}

export async function executeCommand(
  connectionId: string,
  command: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  const client = getActiveConnections().get(connectionId);
  if (!client) throw new Error("Not connected");

  return enqueue(connectionId, () => execOnClient(client, command, timeoutMs));
}

export async function executeOpenClawCommand(
  connectionId: string,
  subcommand: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return executeCommand(connectionId, `openclaw ${subcommand}`, timeoutMs);
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
