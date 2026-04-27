/**
 * Back-compat re-export shim. The dual-driver implementation now lives at
 * `lib/db/index.ts`. New code should import from `@/lib/db`.
 */
export { getDb, getSqlite } from "@/lib/db";
