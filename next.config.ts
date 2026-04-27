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

const nextConfig: NextConfig = {
  serverExternalPackages: EXTERNAL_NATIVE,
};

export default nextConfig;
