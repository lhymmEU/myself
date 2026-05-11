import type { NextConfig } from "next";

/**
 * Native packages loaded at runtime via `require()` (not bundled).
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
