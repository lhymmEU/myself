import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";

const dataRoot = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(dataRoot, "data", "dashboard.db");

function ensureDbDirectory() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb() {
  if (!_db) {
    ensureDbDirectory();
    try {
      _sqlite = new Database(DB_PATH);
    } catch (err: unknown) {
      throw err;
    }
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
    _db = drizzle(_sqlite);
  }
  return _db;
}

export function getSqlite() {
  if (!_sqlite) {
    getDb();
  }
  return _sqlite!;
}
