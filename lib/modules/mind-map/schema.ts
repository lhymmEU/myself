/**
 * Re-export shim. The source of truth lives at `lib/db/schema/sqlite/mind-map.ts`
 * (with a Postgres mirror at `lib/db/schema/postgres/mind-map.ts`). This shim
 * keeps existing imports working until they migrate to `@/lib/db/schema`.
 */
export * from "@/lib/db/schema/sqlite/mind-map";
