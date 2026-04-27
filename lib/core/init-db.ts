/**
 * Database bootstrap.
 *
 * - Local (SQLite): runs `drizzle/sqlite/*.sql` migrations + a small batch of
 *   in-place ALTER patches that bring legacy DB files up to the current shape.
 * - Cloud (Postgres/Supabase): no-op at runtime. Migrations live in
 *   `drizzle/postgres/*.sql` and are applied via Supabase CLI / CI.
 *
 * The legacy `try { ALTER … } catch {}` migration pattern was retired in
 * favour of the SQL files; the only remaining `try`/`catch` block is the
 * legacy `user_skills.level` integer→text rewrite, which is data-shaped and
 * cannot be made idempotent in plain SQL.
 */
import { isCloud, isLocal } from "./runtime";

let initialized = false;

function readSqliteMigrationFiles(): string[] {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  const fs = require("fs");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dir = path.join(process.cwd(), "drizzle", "sqlite");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort()
    .map((f: string) => fs.readFileSync(path.join(dir, f), "utf8"));
}

/**
 * Strip block (`/* … *\/`) and line (`-- …`) comments from a SQL string so
 * the simple `;` splitter below doesn't get confused by `;` inside comments.
 */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "");
}

/**
 * Apply a SQLite migration file defensively. We split on `;` and run each
 * statement individually, swallowing the narrow set of errors that mean
 * "this migration was already applied" (duplicate column / table exists).
 *
 * Drizzle's incremental migrations for SQLite are mostly `CREATE TABLE IF
 * NOT EXISTS` (already idempotent) and `ALTER TABLE … ADD COLUMN`, which
 * SQLite does not support `IF NOT EXISTS` on. Catching the duplicate-column
 * error preserves idempotency for that case.
 */
function applySqliteMigration(
  sqlite: import("better-sqlite3").Database,
  sql: string,
): void {
  const stripped = stripSqlComments(sql);
  const statements = stripped
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    try {
      sqlite.exec(stmt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // SQLite reports "duplicate column name: foo" when ADD COLUMN reruns,
      // and "table foo already exists" if a CREATE TABLE without IF NOT
      // EXISTS gets hit twice (we don't ship those, but be defensive).
      if (
        /duplicate column name/i.test(msg) ||
        /already exists/i.test(msg)
      ) {
        continue;
      }
      throw err;
    }
  }
}

function applyLegacyDataMigrations(sqlite: import("better-sqlite3").Database) {
  // Legacy: user_skills.level was once INTEGER, now TEXT. One-shot rewrite.
  try {
    const info = sqlite
      .prepare(`PRAGMA table_info(user_skills)`)
      .all() as { name: string; type: string }[];
    const levelCol = info.find((c) => c.name === "level");
    if (levelCol && levelCol.type === "INTEGER") {
      sqlite.exec(`ALTER TABLE user_skills RENAME TO user_skills_old`);
      sqlite.exec(`
        CREATE TABLE user_skills (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT 'local-user',
          name TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'familiar' CHECK(level IN ('familiar','fluent','mastering')),
          category TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        );
      `);
      sqlite.exec(`
        INSERT INTO user_skills (id, name, level, category, created_at)
        SELECT id, name,
          CASE
            WHEN level <= 3 THEN 'familiar'
            WHEN level <= 7 THEN 'fluent'
            ELSE 'mastering'
          END,
          category, created_at
        FROM user_skills_old
      `);
      sqlite.exec(`DROP TABLE user_skills_old`);
    }
  } catch {
    // shape already fine
  }

  try {
    const info = sqlite
      .prepare(`PRAGMA table_info(skill_wishlist)`)
      .all() as { name: string; type: string }[];
    const levelCol = info.find((c) => c.name === "target_level");
    if (levelCol && levelCol.type === "INTEGER") {
      sqlite.exec(`ALTER TABLE skill_wishlist RENAME TO skill_wishlist_old`);
      sqlite.exec(`
        CREATE TABLE skill_wishlist (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT 'local-user',
          name TEXT NOT NULL,
          target_level TEXT NOT NULL DEFAULT 'familiar' CHECK(target_level IN ('familiar','fluent','mastering')),
          priority TEXT NOT NULL DEFAULT 'medium',
          notes TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        );
      `);
      sqlite.exec(`
        INSERT INTO skill_wishlist (id, name, target_level, priority, notes, created_at)
        SELECT id, name,
          CASE
            WHEN target_level <= 3 THEN 'familiar'
            WHEN target_level <= 7 THEN 'fluent'
            ELSE 'mastering'
          END,
          priority, notes, created_at
        FROM skill_wishlist_old
      `);
      sqlite.exec(`DROP TABLE skill_wishlist_old`);
    }
  } catch {
    // shape already fine
  }
}

function patchLegacySqliteSchema(sqlite: import("better-sqlite3").Database) {
  // Bring older DB files (pre-user_id, pre-settings PK rewrite) up to current.
  const tablesNeedingUserId = [
    "life_nodes",
    "mind_map_scenes",
    "pm_user_profiles",
    "pm_features",
    "pm_demands",
    "pm_stakeholders",
    "todos",
    "plan_folders",
    "plan_pages",
    "character_appearance",
    "user_skills",
    "skill_wishlist",
    "wishlist_todos",
    "claw_assigned_jobs",
    "invoice_clients",
    "invoice_signatures",
    "invoices",
    "marked_collections",
    "marked_items",
    "cron_jobs",
    "claw_connections",
    "finance_accounts",
    "finance_transactions",
    "finance_budgets",
    "finance_investments",
    "vault_secrets",
  ];
  for (const table of tablesNeedingUserId) {
    try {
      const info = sqlite
        .prepare(`PRAGMA table_info(${table})`)
        .all() as { name: string }[];
      if (info.length === 0) continue; // table not present
      if (!info.some((c) => c.name === "user_id")) {
        sqlite.exec(
          `ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-user'`,
        );
      }
    } catch {
      // ignore — newly created table will already have it
    }
  }

  // Add new claw_connections columns introduced for the cloud relay and
  // the edge transport (Flavor A — browser WASM SSH via Worker TCP bridge).
  const clawCols = [
    ["transport", "TEXT NOT NULL DEFAULT 'ssh'"],
    ["pairing_code", "TEXT"],
    ["pairing_expires_at", "INTEGER"],
    ["agent_jwt", "TEXT"],
    ["relay_url", "TEXT"],
    ["public_key", "TEXT"],
    ["gateway_port", "INTEGER NOT NULL DEFAULT 18789"],
    ["credential_secret_id", "TEXT"],
    ["host_key_fingerprint", "TEXT"],
  ] as const;
  try {
    const info = sqlite
      .prepare(`PRAGMA table_info(claw_connections)`)
      .all() as { name: string }[];
    if (info.length > 0) {
      const have = new Set(info.map((c) => c.name));
      for (const [col, defn] of clawCols) {
        if (!have.has(col)) {
          try {
            sqlite.exec(`ALTER TABLE claw_connections ADD COLUMN ${col} ${defn}`);
          } catch {
            // best-effort
          }
        }
      }
    }
  } catch {
    // table not present yet
  }
}

export function initDatabase() {
  if (initialized) return;

  if (isCloud()) {
    initialized = true;
    return;
  }

  if (!isLocal()) {
    initialized = true;
    return;
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getSqlite } = require("./db");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const sqlite = getSqlite() as import("better-sqlite3").Database;

  for (const sql of readSqliteMigrationFiles()) {
    applySqliteMigration(sqlite, sql);
  }

  patchLegacySqliteSchema(sqlite);
  applyLegacyDataMigrations(sqlite);

  initialized = true;
}
