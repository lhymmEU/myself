/**
 * Vault DB adapter.
 *
 * - Local: vault rows live in their own SQLite file (default `data/vault.db`,
 *   path is configurable via the main DB's `vault_path` setting). This keeps
 *   the encrypted blob portable / backup-friendly.
 * - Cloud: vault rows live in the main Postgres DB, scoped by `user_id`. The
 *   path-setting / moveVaultDb helpers become no-ops.
 *
 * Both modes return a Drizzle handle compatible with the SQLite-flavored
 * queries written in `actions.ts`.
 */
import { isCloud, isLocal } from "@/lib/core/runtime";
import { getDb, type AppDb } from "@/lib/db";

const dataRoot = process.env.DATA_DIR || process.cwd();
const DEFAULT_VAULT_PATH = (() => {
  if (isCloud()) return ":cloud:";
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return path.join(dataRoot, "data", "vault.db");
})();

const VAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS vault_meta (
  user_id TEXT NOT NULL DEFAULT 'local-user',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS vault_secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  encrypted_value TEXT NOT NULL,
  nonce TEXT NOT NULL,
  encrypted_notes TEXT,
  notes_nonce TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

let _vaultSqlite: unknown | null = null;
let _vaultDrizzle: AppDb | null = null;
let _currentPath: string | null = null;

export function getVaultPathSetting(): string {
  if (isCloud()) return ":cloud:";
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getSqlite } = require("@/lib/db");
  /* eslint-enable @typescript-eslint/no-require-imports */
  try {
    const mainDb = getSqlite();
    const row = mainDb
      .prepare(
        "SELECT value FROM settings WHERE key = 'vault_path' AND user_id = 'local-user'",
      )
      .get() as { value: string } | undefined;
    return row?.value ?? DEFAULT_VAULT_PATH;
  } catch {
    return DEFAULT_VAULT_PATH;
  }
}

export function setVaultPathSetting(newPath: string): void {
  if (isCloud()) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getSqlite } = require("@/lib/db");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const mainDb = getSqlite();
  const now = Date.now();
  mainDb
    .prepare(
      "INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES ('local-user', ?, ?, ?)",
    )
    .run("vault_path", newPath, now);
}

function ensureDir(filePath: string) {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  const fs = require("fs");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Returns a Drizzle handle scoped to the vault tables. In local mode this is
 * a dedicated SQLite handle; in cloud mode it's the main Postgres handle.
 */
export function getVaultDb(): AppDb {
  if (isCloud()) {
    return getDb();
  }
  if (!isLocal()) {
    throw new Error("[vault] unknown deployment mode");
  }

  const configuredPath = getVaultPathSetting();
  if (_vaultDrizzle && _currentPath === configuredPath) {
    return _vaultDrizzle;
  }

  if (_vaultSqlite) {
    try {
      (_vaultSqlite as { close: () => void }).close();
    } catch {
      /* already closed */
    }
  }

  ensureDir(configuredPath);
  /* eslint-disable @typescript-eslint/no-require-imports */
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  /* eslint-enable @typescript-eslint/no-require-imports */

  const sqlite = new Database(configuredPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(VAULT_SCHEMA_SQL);
  // Bring legacy vault DBs (pre-user_id) up to current shape.
  try {
    const info = sqlite
      .prepare(`PRAGMA table_info(vault_secrets)`)
      .all() as { name: string }[];
    if (info.length > 0 && !info.some((c) => c.name === "user_id")) {
      sqlite.exec(
        `ALTER TABLE vault_secrets ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-user'`,
      );
    }
  } catch {
    // ignore
  }

  _vaultSqlite = sqlite;
  const handle = drizzle(sqlite) as AppDb;
  _vaultDrizzle = handle;
  _currentPath = configuredPath;
  return handle;
}

/**
 * Local-only: returns the raw better-sqlite3 handle for the vault file.
 * Cloud callers must go through Drizzle on the main DB.
 */
export function getVaultSqlite(): import("better-sqlite3").Database {
  if (!isLocal()) {
    throw new Error(
      "[vault] getVaultSqlite is local-only. Use getVaultDb() for Drizzle access in cloud.",
    );
  }
  if (!_vaultSqlite) getVaultDb();
  return _vaultSqlite as import("better-sqlite3").Database;
}

export function closeVaultDb(): void {
  if (_vaultSqlite) {
    try {
      (_vaultSqlite as { close: () => void }).close();
    } catch {
      /* ignore */
    }
    _vaultSqlite = null;
    _vaultDrizzle = null;
    _currentPath = null;
  }
}

export function moveVaultDb(newPath: string): void {
  if (isCloud()) return;
  const oldPath = getVaultPathSetting();
  if (oldPath === newPath) return;

  closeVaultDb();
  ensureDir(newPath);

  /* eslint-disable @typescript-eslint/no-require-imports */
  const fs = require("fs");
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (fs.existsSync(oldPath)) {
    fs.copyFileSync(oldPath, newPath);
    const walPath = oldPath + "-wal";
    const shmPath = oldPath + "-shm";
    if (fs.existsSync(walPath)) fs.copyFileSync(walPath, newPath + "-wal");
    if (fs.existsSync(shmPath)) fs.copyFileSync(shmPath, newPath + "-shm");
  }

  setVaultPathSetting(newPath);
}
