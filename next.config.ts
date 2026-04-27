import type { NextConfig } from "next";

/**
 * Packages that must be left as runtime `require()`s rather than bundled.
 *
 * `serverExternalPackages` is an opt-OUT from bundling: anything listed
 * here is loaded at runtime via Node's resolver, not inlined into the
 * server chunks. Packages NOT listed are followed by Turbopack's static
 * analysis and inlined — which fails for any package containing native
 * `.node` bindings or other non-ESM-placeable assets.
 *
 * Local-only natives (`better-sqlite3`, `ssh2`, `nodemailer`) MUST stay
 * external in cloud builds too: even though their `require()` is gated
 * by `isLocal()` at runtime, Turbopack still walks the `require()` chain
 * statically and tries to inline them. Listing them here breaks that
 * walk; the runtime guards (in transport-ssh.ts, mailer.ts, db/index.ts)
 * ensure they're never actually loaded in cloud execution.
 */
const EXTERNAL_NATIVE: string[] = [
  "better-sqlite3",
  "ssh2",
  "nodemailer",
  "postgres",
];

/**
 * Cloud builds must use the Postgres-flavored Drizzle schemas (e.g.
 * `user_id uuid` instead of `text`). The codebase imports the SQLite
 * variants by default so TypeScript and `npm run dev` (local) work
 * without env juggling; this alias swaps each sqlite schema file for
 * its postgres counterpart at module-resolution time when building for
 * cloud. Keeps every action-code import unchanged.
 *
 * The schema-parity test (`scripts/schema-parity.ts`) guarantees the two
 * directories export the exact same names, so the aliases are 1:1.
 */
const CLOUD_SCHEMA_FILES = [
  "mind-map",
  "todos",
  "plans",
  "settings",
  "dashboard",
  "invoice",
  "marked",
  "claw",
  "finance",
  "vault",
] as const;

const isCloudBuild = process.env.DEPLOYMENT_MODE === "cloud";

const cloudSchemaAliases: Record<string, string> = isCloudBuild
  ? Object.fromEntries([
      ["@/lib/db/schema", "@/lib/db/schema/postgres"],
      ["@/lib/db/schema/sqlite", "@/lib/db/schema/postgres"],
      ...CLOUD_SCHEMA_FILES.map((name) => [
        `@/lib/db/schema/sqlite/${name}`,
        `@/lib/db/schema/postgres/${name}`,
      ]),
    ])
  : {};

const nextConfig: NextConfig = {
  serverExternalPackages: EXTERNAL_NATIVE,
  ...(isCloudBuild && {
    turbopack: {
      resolveAlias: cloudSchemaAliases,
    },
  }),
};

export default nextConfig;
