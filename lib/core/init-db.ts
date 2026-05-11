/**
 * Database bootstrap.
 *
 * Postgres schema is applied via Supabase CLI / CI using `drizzle/postgres/*.sql`.
 * No runtime migrations run here.
 */
let initialized = false;

export function initDatabase() {
  if (initialized) return;
  initialized = true;
}
