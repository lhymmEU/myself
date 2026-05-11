/**
 * Drizzle + postgres-js against Supabase Postgres (`DATABASE_URL`).
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

let _db: AppDb | null = null;
let _pgClient: unknown | null = null;

function buildPostgresDriver(): AppDb {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[db] DATABASE_URL is not set. Point it at your Supabase Postgres connection string.",
    );
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const postgres = require("postgres");
  const { drizzle } = require("drizzle-orm/postgres-js");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const client = postgres(url, { prepare: false, max: 10 });
  _pgClient = client;
  return drizzle(client, { schema }) as AppDb;
}

export function getDb(): AppDb {
  if (!_db) {
    _db = buildPostgresDriver();
  }
  return _db;
}

/** Raw postgres-js client (same pool as Drizzle). */
export function getPgClient() {
  if (!_pgClient) {
    getDb();
  }
  return _pgClient;
}
