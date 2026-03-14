import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { getSqlite } from "@/lib/core/db";

const VAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS vault_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_secrets (
  id TEXT PRIMARY KEY,
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

const dataRoot = process.env.DATA_DIR || process.cwd();
const DEFAULT_VAULT_PATH = path.join(dataRoot, "data", "vault.db");

let _vaultDb: Database.Database | null = null;
let _currentPath: string | null = null;

export function getVaultPathSetting(): string {
  try {
    const mainDb = getSqlite();
    const row = mainDb
      .prepare("SELECT value FROM settings WHERE key = 'vault_path'")
      .get() as { value: string } | undefined;
    return row?.value ?? DEFAULT_VAULT_PATH;
  } catch {
    return DEFAULT_VAULT_PATH;
  }
}

export function setVaultPathSetting(newPath: string): void {
  const mainDb = getSqlite();
  const now = Date.now();
  mainDb
    .prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
    )
    .run("vault_path", newPath, now);
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getVaultDb(): Database.Database {
  const configuredPath = getVaultPathSetting();

  if (_vaultDb && _currentPath === configuredPath) {
    return _vaultDb;
  }

  if (_vaultDb) {
    try {
      _vaultDb.close();
    } catch {
      /* already closed */
    }
  }

  ensureDir(configuredPath);
  _vaultDb = new Database(configuredPath);
  _vaultDb.pragma("journal_mode = WAL");
  _vaultDb.exec(VAULT_SCHEMA_SQL);
  _currentPath = configuredPath;

  return _vaultDb;
}

export function closeVaultDb(): void {
  if (_vaultDb) {
    try {
      _vaultDb.close();
    } catch {
      /* ignore */
    }
    _vaultDb = null;
    _currentPath = null;
  }
}

export function moveVaultDb(newPath: string): void {
  const oldPath = getVaultPathSetting();
  if (oldPath === newPath) return;

  closeVaultDb();

  ensureDir(newPath);
  if (fs.existsSync(oldPath)) {
    fs.copyFileSync(oldPath, newPath);
    const walPath = oldPath + "-wal";
    const shmPath = oldPath + "-shm";
    if (fs.existsSync(walPath)) fs.copyFileSync(walPath, newPath + "-wal");
    if (fs.existsSync(shmPath)) fs.copyFileSync(shmPath, newPath + "-shm");
  }

  setVaultPathSetting(newPath);
}
