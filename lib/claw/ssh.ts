/**
 * Single SSH transport for the rebuilt claw page.
 *
 * Caches one `ssh2` Client per connection on `globalThis` so the dev-mode
 * module-reload cycle doesn't churn through TCP handshakes. The connection
 * keeps itself warm with a 10s × 3 keepalive, mirroring the old transport.
 *
 * This module is local-only — it `require`s the native `ssh2` package
 * lazily so cloud builds never bundle it. Callers must gate with
 * `isLocal()` before invoking.
 */
import type { Client as SshClient, ConnectConfig } from "ssh2";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { getClawConnection } from "./db";

interface CachedClient {
  client: SshClient;
  ready: Promise<void>;
}

interface ClawTransportGlobal {
  __claw_ssh_clients?: Map<string, CachedClient>;
}

function getCache(): Map<string, CachedClient> {
  const g = globalThis as unknown as ClawTransportGlobal;
  if (!g.__claw_ssh_clients) {
    g.__claw_ssh_clients = new Map();
  }
  return g.__claw_ssh_clients;
}

async function loadSsh2(): Promise<typeof import("ssh2")> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("ssh2") as typeof import("ssh2");
  return mod;
}

async function buildConnectConfig(
  connectionId: string,
  userId: string = LOCAL_USER_ID,
): Promise<ConnectConfig> {
  const conn = await getClawConnection(connectionId, userId);
  if (!conn) {
    throw new Error(`Connection ${connectionId} not found`);
  }
  const base: ConnectConfig = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    keepaliveInterval: 10_000,
    keepaliveCountMax: 3,
    readyTimeout: 15_000,
  };
  if (conn.authMethod === "password") {
    if (!conn.password) {
      throw new Error("Password auth selected but no password stored");
    }
    return { ...base, password: conn.password };
  }
  if (conn.authMethod === "key") {
    if (!conn.privateKey) {
      throw new Error("Key auth selected but no private key stored");
    }
    return {
      ...base,
      privateKey: conn.privateKey,
      ...(conn.passphrase ? { passphrase: conn.passphrase } : {}),
    };
  }
  throw new Error(`Unknown authMethod: ${conn.authMethod}`);
}

async function dial(
  connectionId: string,
  userId: string = LOCAL_USER_ID,
): Promise<CachedClient> {
  const { Client } = await loadSsh2();
  const config = await buildConnectConfig(connectionId, userId);
  const client = new Client();
  const ready = new Promise<void>((resolve, reject) => {
    client.once("ready", () => resolve());
    client.once("error", (err) => reject(err));
    client.once("close", () => {
      // Drop from the cache so the next call re-dials.
      getCache().delete(`${userId}:${connectionId}`);
    });
  });
  client.connect(config);
  return { client, ready };
}

/**
 * @param userId - Must match the row in `claw_connections` (real Supabase uuid
 * in cloud). Defaults to {@link LOCAL_USER_ID} for single-user local SQLite.
 */
export async function connect(
  connectionId: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const cache = getCache();
  const cacheKey = `${userId}:${connectionId}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    await existing.ready;
    return;
  }
  const cached = await dial(connectionId, userId);
  cache.set(cacheKey, cached);
  await cached.ready;
}

export function disconnect(
  connectionId: string,
  userId: string = LOCAL_USER_ID,
): void {
  const cache = getCache();
  const cacheKey = `${userId}:${connectionId}`;
  const existing = cache.get(cacheKey);
  if (!existing) return;
  cache.delete(cacheKey);
  try {
    existing.client.end();
  } catch {
    // best-effort
  }
}

export function isConnected(
  connectionId: string,
  userId: string = LOCAL_USER_ID,
): boolean {
  return getCache().has(`${userId}:${connectionId}`);
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export async function executeCommand(
  connectionId: string,
  command: string,
  timeoutMs = 120_000,
  userId: string = LOCAL_USER_ID,
): Promise<ExecResult> {
  await connect(connectionId, userId);
  const cached = getCache().get(`${userId}:${connectionId}`);
  if (!cached) {
    throw new Error("SSH connection unexpectedly closed");
  }
  return new Promise<ExecResult>((resolve, reject) => {
    cached.client.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        try {
          stream.close();
        } catch {
          // best-effort
        }
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      stream
        .on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf8");
        })
        .on("close", (code: number | null) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, code: code ?? 0 });
        })
        .stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString("utf8");
        });
    });
  });
}

/**
 * Streaming variant — yields stdout chunks as they arrive. Used by the
 * chat route so users see partial output instead of waiting for the
 * entire command to complete.
 */
export async function* streamCommand(
  connectionId: string,
  command: string,
  timeoutMs = 120_000,
  userId: string = LOCAL_USER_ID,
): AsyncGenerator<string, ExecResult, void> {
  await connect(connectionId, userId);
  const cached = getCache().get(`${userId}:${connectionId}`);
  if (!cached) {
    throw new Error("SSH connection unexpectedly closed");
  }
  type Chunk = { kind: "data"; text: string } | { kind: "end"; code: number };
  const queue: Chunk[] = [];
  let resolveNext: ((c: Chunk) => void) | null = null;
  let rejectNext: ((err: Error) => void) | null = null;
  let stderr = "";

  const push = (chunk: Chunk) => {
    if (resolveNext) {
      resolveNext(chunk);
      resolveNext = null;
      rejectNext = null;
    } else {
      queue.push(chunk);
    }
  };

  const fail = (err: Error) => {
    if (rejectNext) {
      rejectNext(err);
      resolveNext = null;
      rejectNext = null;
    } else {
      // Stash the error as a synthetic end so the consumer surfaces it.
      queue.push({ kind: "end", code: 1 });
    }
  };

  await new Promise<void>((resolve, reject) => {
    cached.client.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      const timer = setTimeout(() => {
        try {
          stream.close();
        } catch {
          // best-effort
        }
        fail(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      stream
        .on("data", (chunk: Buffer) => {
          push({ kind: "data", text: chunk.toString("utf8") });
        })
        .on("close", (code: number | null) => {
          clearTimeout(timer);
          push({ kind: "end", code: code ?? 0 });
        })
        .stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString("utf8");
        });

      resolve();
    });
  });

  let totalStdout = "";
  while (true) {
    const chunk = await new Promise<Chunk>((resolve, reject) => {
      const queued = queue.shift();
      if (queued) {
        resolve(queued);
        return;
      }
      resolveNext = resolve;
      rejectNext = reject;
    });
    if (chunk.kind === "data") {
      totalStdout += chunk.text;
      yield chunk.text;
      continue;
    }
    return { stdout: totalStdout, stderr, code: chunk.code };
  }
}
