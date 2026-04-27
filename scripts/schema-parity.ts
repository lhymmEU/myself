/**
 * Schema-parity guard.
 *
 * Loads the SQLite and Postgres Drizzle schemas, then asserts that every
 * user-facing table is structurally identical:
 *   - Same table names on both sides.
 *   - Same column names per table.
 *   - Same logical Drizzle column type per column (string / number / etc.).
 *
 * Cloud-only differences that we expect:
 *   - Postgres `user_id` is `uuid`, SQLite `user_id` is `text`. Both report
 *     dataType = "string" so they pass the check.
 *   - SQLite uses `integer` epoch millis where Postgres uses `bigint` —
 *     both report dataType = "number".
 *
 * Run via `npx tsx scripts/schema-parity.ts`. Exits non-zero on drift,
 * which fails the CI check that runs on every PR.
 */
import * as sqliteSchema from "../lib/db/schema/sqlite";
import * as pgSchema from "../lib/db/schema/postgres";
import { getTableConfig as getSqliteTableConfig } from "drizzle-orm/sqlite-core";
import { getTableConfig as getPgTableConfig } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { PgTable } from "drizzle-orm/pg-core";

interface TableShape {
  name: string;
  columns: Map<string, string>;
}

function collectSqliteTables(): Map<string, TableShape> {
  const out = new Map<string, TableShape>();
  for (const value of Object.values(sqliteSchema)) {
    if (is(value, SQLiteTable)) {
      const cfg = getSqliteTableConfig(value);
      const cols = new Map<string, string>();
      for (const col of cfg.columns) {
        cols.set(col.name, col.dataType);
      }
      out.set(cfg.name, { name: cfg.name, columns: cols });
    }
  }
  return out;
}

function collectPgTables(): Map<string, TableShape> {
  const out = new Map<string, TableShape>();
  for (const value of Object.values(pgSchema)) {
    if (is(value, PgTable)) {
      const cfg = getPgTableConfig(value);
      const cols = new Map<string, string>();
      for (const col of cfg.columns) {
        cols.set(col.name, col.dataType);
      }
      out.set(cfg.name, { name: cfg.name, columns: cols });
    }
  }
  return out;
}

function diff(): string[] {
  const sqliteTables = collectSqliteTables();
  const pgTables = collectPgTables();
  const errors: string[] = [];

  const sqliteOnly = [...sqliteTables.keys()].filter((t) => !pgTables.has(t));
  const pgOnly = [...pgTables.keys()].filter((t) => !sqliteTables.has(t));
  for (const t of sqliteOnly)
    errors.push(`Table "${t}" exists in SQLite schema but not in Postgres schema.`);
  for (const t of pgOnly)
    errors.push(`Table "${t}" exists in Postgres schema but not in SQLite schema.`);

  for (const [tableName, sqliteShape] of sqliteTables) {
    const pgShape = pgTables.get(tableName);
    if (!pgShape) continue;

    const sqliteCols = new Set(sqliteShape.columns.keys());
    const pgCols = new Set(pgShape.columns.keys());

    for (const col of sqliteCols) {
      if (!pgCols.has(col)) {
        errors.push(
          `Table "${tableName}": column "${col}" is in SQLite schema but missing in Postgres schema.`,
        );
      }
    }
    for (const col of pgCols) {
      if (!sqliteCols.has(col)) {
        errors.push(
          `Table "${tableName}": column "${col}" is in Postgres schema but missing in SQLite schema.`,
        );
      }
    }

    for (const [colName, sqliteType] of sqliteShape.columns) {
      const pgType = pgShape.columns.get(colName);
      if (pgType && pgType !== sqliteType) {
        errors.push(
          `Table "${tableName}": column "${colName}" has dataType "${sqliteType}" in SQLite but "${pgType}" in Postgres.`,
        );
      }
    }
  }

  return errors;
}

function main() {
  const errors = diff();
  if (errors.length === 0) {
    const sqliteCount = collectSqliteTables().size;
    const pgCount = collectPgTables().size;
    console.log(
      `[schema-parity] OK — ${sqliteCount} sqlite tables ↔ ${pgCount} postgres tables in sync.`,
    );
    process.exit(0);
  }

  console.error("[schema-parity] FAIL — schema drift detected:");
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    `\nFix by aligning lib/db/schema/sqlite/* with lib/db/schema/postgres/* (and matching the SQL migrations under drizzle/{sqlite,postgres}/).`,
  );
  process.exit(1);
}

main();
