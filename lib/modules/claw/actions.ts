import { Client, type ConnectConfig } from "ssh2";
import { nanoid } from "nanoid";
import { getSqlite } from "@/lib/core/db";
import type {
  ClawConnection,
  CreateConnectionInput,
  UpdateConnectionInput,
} from "./types";

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS claw_connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_method TEXT NOT NULL DEFAULT 'key',
  password TEXT,
  private_key TEXT,
  passphrase TEXT,
  gateway_port INTEGER NOT NULL DEFAULT 18789,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

let tableReady = false;

function ensureTable() {
  if (tableReady) return;
  const db = getSqlite();
  db.exec(INIT_SQL);
  tableReady = true;
}

interface ConnectionRow {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: string;
  password: string | null;
  private_key: string | null;
  passphrase: string | null;
  gateway_port: number;
  is_default: number;
  created_at: number;
  updated_at: number;
}

function rowToConnection(row: ConnectionRow): ClawConnection {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    authMethod: row.auth_method as "password" | "key",
    password: row.password ?? undefined,
    privateKey: row.private_key ?? undefined,
    passphrase: row.passphrase ?? undefined,
    gatewayPort: row.gateway_port,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllConnections(): ClawConnection[] {
  ensureTable();
  const db = getSqlite();
  const rows = db
    .prepare("SELECT * FROM claw_connections ORDER BY is_default DESC, updated_at DESC")
    .all() as ConnectionRow[];
  return rows.map(rowToConnection);
}

export function getConnection(id: string): ClawConnection | null {
  ensureTable();
  const db = getSqlite();
  const row = db
    .prepare("SELECT * FROM claw_connections WHERE id = ?")
    .get(id) as ConnectionRow | undefined;
  return row ? rowToConnection(row) : null;
}

export function getDefaultConnection(): ClawConnection | null {
  ensureTable();
  const db = getSqlite();
  const row = db
    .prepare("SELECT * FROM claw_connections WHERE is_default = 1 LIMIT 1")
    .get() as ConnectionRow | undefined;
  if (row) return rowToConnection(row);
  const first = db
    .prepare("SELECT * FROM claw_connections ORDER BY updated_at DESC LIMIT 1")
    .get() as ConnectionRow | undefined;
  return first ? rowToConnection(first) : null;
}

export function createConnection(input: CreateConnectionInput): ClawConnection {
  ensureTable();
  const db = getSqlite();
  const now = Date.now();
  const id = nanoid();

  const existing = db
    .prepare("SELECT COUNT(*) as count FROM claw_connections")
    .get() as { count: number };
  const isDefault = existing.count === 0 ? 1 : 0;

  db.prepare(
    `INSERT INTO claw_connections (id, name, host, port, username, auth_method, password, private_key, passphrase, gateway_port, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.host,
    input.port ?? 22,
    input.username,
    input.authMethod,
    input.password ?? null,
    input.privateKey ?? null,
    input.passphrase ?? null,
    input.gatewayPort ?? 18789,
    isDefault,
    now,
    now
  );

  return {
    id,
    name: input.name,
    host: input.host,
    port: input.port ?? 22,
    username: input.username,
    authMethod: input.authMethod,
    password: input.password,
    privateKey: input.privateKey,
    passphrase: input.passphrase,
    gatewayPort: input.gatewayPort ?? 18789,
    isDefault: isDefault === 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateConnection(input: UpdateConnectionInput): ClawConnection | null {
  ensureTable();
  const db = getSqlite();
  const existing = db
    .prepare("SELECT * FROM claw_connections WHERE id = ?")
    .get(input.id) as ConnectionRow | undefined;
  if (!existing) return null;

  const now = Date.now();
  const name = input.name ?? existing.name;
  const host = input.host ?? existing.host;
  const port = input.port ?? existing.port;
  const username = input.username ?? existing.username;
  const authMethod = input.authMethod ?? existing.auth_method;
  const password = input.password !== undefined ? input.password : existing.password;
  const privateKey = input.privateKey !== undefined ? input.privateKey : existing.private_key;
  const passphrase = input.passphrase !== undefined ? input.passphrase : existing.passphrase;
  const gatewayPort = input.gatewayPort ?? existing.gateway_port;

  db.prepare(
    `UPDATE claw_connections
     SET name = ?, host = ?, port = ?, username = ?, auth_method = ?,
         password = ?, private_key = ?, passphrase = ?, gateway_port = ?, updated_at = ?
     WHERE id = ?`
  ).run(name, host, port, username, authMethod, password, privateKey, passphrase, gatewayPort, now, input.id);

  return {
    id: input.id,
    name,
    host,
    port,
    username,
    authMethod: authMethod as "password" | "key",
    password: password ?? undefined,
    privateKey: privateKey ?? undefined,
    passphrase: passphrase ?? undefined,
    gatewayPort,
    isDefault: existing.is_default === 1,
    createdAt: existing.created_at,
    updatedAt: now,
  };
}

export function deleteConnection(id: string): void {
  ensureTable();
  const db = getSqlite();
  db.prepare("DELETE FROM claw_connections WHERE id = ?").run(id);
}

export function setDefaultConnection(id: string): void {
  ensureTable();
  const db = getSqlite();
  db.prepare("UPDATE claw_connections SET is_default = 0").run();
  db.prepare("UPDATE claw_connections SET is_default = 1 WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// SSH execution helpers
// ---------------------------------------------------------------------------

const activeConnections = new Map<string, Client>();

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
  return activeConnections.get(connectionId);
}

export async function connectSSH(connectionId: string): Promise<{ success: boolean; error?: string }> {
  const conn = getConnection(connectionId);
  if (!conn) return { success: false, error: "Connection not found" };

  const existing = activeConnections.get(connectionId);
  if (existing) {
    existing.end();
    activeConnections.delete(connectionId);
  }

  return new Promise((resolve) => {
    const client = new Client();
    const config = buildConnectConfig(conn);

    client.on("ready", () => {
      activeConnections.set(connectionId, client);
      resolve({ success: true });
    });

    client.on("error", (err) => {
      activeConnections.delete(connectionId);
      resolve({ success: false, error: err.message });
    });

    client.on("close", () => {
      activeConnections.delete(connectionId);
    });

    client.connect(config);
  });
}

export function disconnectSSH(connectionId: string): void {
  const client = activeConnections.get(connectionId);
  if (client) {
    client.end();
    activeConnections.delete(connectionId);
  }
}

export function isSSHConnected(connectionId: string): boolean {
  return activeConnections.has(connectionId);
}

export async function executeCommand(
  connectionId: string,
  command: string,
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string; code: number }> {
  const client = activeConnections.get(connectionId);
  if (!client) throw new Error("Not connected");

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    client.exec(command, (err, stream) => {
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

export async function executeOpenClawCommand(
  connectionId: string,
  subcommand: string,
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return executeCommand(connectionId, `openclaw ${subcommand}`, timeoutMs);
}
