/**
 * Dual-driver Drizzle entrypoint.
 *
 * Local mode → better-sqlite3 (file at data/dashboard.db).
 * Cloud mode → postgres-js pointed at Supabase (DATABASE_URL).
 *
 * Action code calls `getDb()` and writes Drizzle queries against tables imported
 * from `@/lib/db/schema`. The schema barrel resolves to `./schema/sqlite` by
 * default (kept on the dev/local path) and is webpack-aliased to
 * `./schema/postgres` for cloud builds in next.config.ts.
 */
import { isCloud, isLocal } from "@/lib/core/runtime";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Unified Drizzle handle exposed by `getDb()`.
 *
 * It's the union of the two driver-specific Drizzle types, so action code
 * can call any method that exists on both (`.select()`, `.insert()`, etc.).
 * Driver-specific niceties like `.get()` / `.all()` only live on the sqlite
 * side — those call sites already only run in local mode.
 */
export type AppDb = BetterSQLite3Database & PostgresJsDatabase;

let _db: AppDb | null = null;
let _sqlite: unknown | null = null;
let _pgClient: unknown | null = null;

function buildSqliteDriver(): AppDb {
  // Local-only requires; never imported in the cloud bundle.
  // Using require() here keeps these natives out of the cloud build via
  // serverExternalPackages + the next.config alias.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  const fs = require("fs");
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  /* eslint-enable @typescript-eslint/no-require-imports */

  const dataRoot = process.env.DATA_DIR || process.cwd();
  const DB_PATH = path.join(dataRoot, "data", "dashboard.db");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _sqlite = sqlite;
  return drizzle(sqlite) as AppDb;
}

function buildPostgresDriver(): AppDb {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[db] DATABASE_URL is not set. In cloud mode this must point at the Supabase Postgres connection string.",
    );
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const postgres = require("postgres");
  const { drizzle } = require("drizzle-orm/postgres-js");
  /* eslint-enable @typescript-eslint/no-require-imports */
  // Supabase pooled connections — disable prepared statements for transaction pooler compatibility.
  const client = postgres(url, { prepare: false, max: 10 });
  _pgClient = client;
  return drizzle(client) as AppDb;
}

export function getDb(): AppDb {
  if (!_db) {
    _db = isCloud() ? buildPostgresDriver() : buildSqliteDriver();
  }
  return _db;
}

/**
 * Direct access to the underlying better-sqlite3 handle.
 * Available in local mode only — cloud callers must go through Drizzle.
 *
 * Kept for legacy raw-SQL call sites; new code should not introduce new uses.
 */
export function getSqlite() {
  if (!isLocal()) {
    throw new Error(
      "[db] getSqlite() is only available in local mode. Use Drizzle (getDb) in cloud mode.",
    );
  }
  if (!_sqlite) {
    getDb();
  }
  return _sqlite as import("better-sqlite3").Database;
}

/**
 * Returns the raw postgres-js client. Cloud-only; throws in local mode.
 */
export function getPgClient() {
  if (!isCloud()) {
    throw new Error("[db] getPgClient() is only available in cloud mode.");
  }
  if (!_pgClient) {
    getDb();
  }
  return _pgClient;
}
