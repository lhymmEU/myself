/**
 * Single import surface for action code: `import { todos } from "@/lib/db/schema"`.
 *
 * Defaults to the SQLite shape so TypeScript compiles in dev without env juggling.
 * In cloud builds, `next.config.ts` aliases this module to `./postgres` so the
 * Postgres tables are loaded instead. Both versions expose the same names with
 * the same column types (modulo dialect-native kinds), enforced by the
 * schema-parity test.
 */
export * from "./sqlite";
