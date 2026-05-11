/**
 * Vault rows live in the main Postgres database (`vault_meta`, `vault_secrets`),
 * scoped by `user_id` and RLS.
 */
import { getDb, type AppDb } from "@/lib/db";

export function getVaultDb(): AppDb {
  return getDb();
}

export function getVaultPathSetting(): string {
  return ":supabase:";
}

/** Legacy no-op — per-user vault path is not configurable when stored in Postgres. */
export function moveVaultDb(_newPath: string): void {
  void _newPath;
}
