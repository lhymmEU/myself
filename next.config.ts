import type { NextConfig } from "next";

/**
 * Native modules that must be left as runtime requires (not bundled).
 * - `better-sqlite3` and `ssh2` are local-only; in cloud builds we omit
 *   them so the bundle doesn't try to resolve them at all.
 * - `nodemailer` is local-only too; cloud uses Resend.
 */
const LOCAL_ONLY_NATIVE: string[] = ["better-sqlite3", "ssh2", "nodemailer"];

/**
 * Postgres driver only matters in cloud mode but it's pure JS, so it's
 * cheap to keep in both bundles.
 */
const SHARED_NATIVE: string[] = ["postgres"];

const isCloud =
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "cloud" ||
  process.env.DEPLOYMENT_MODE === "cloud";

const externals = isCloud
  ? SHARED_NATIVE
  : [...SHARED_NATIVE, ...LOCAL_ONLY_NATIVE];

const nextConfig: NextConfig = {
  serverExternalPackages: externals,
};

export default nextConfig;
