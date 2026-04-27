/**
 * Capability layer that owns every "this differs by deployment" decision.
 *
 * Two deployment modes:
 *   - "local"  : single-user SQLite + filesystem + ssh2 + nodemailer (default).
 *   - "cloud"  : multi-tenant Supabase Postgres + Storage + Resend +
 *                E2E-encrypted Worker relay for lobster connections.
 *
 * Every other module imports from this file rather than checking the env
 * directly, so flipping a deployment is a single env-var change.
 */

export type DeploymentMode = "local" | "cloud";

const RAW_MODE =
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ??
  process.env.DEPLOYMENT_MODE ??
  "local";

export const MODE: DeploymentMode =
  RAW_MODE === "cloud" ? "cloud" : "local";

export const isLocal = (): boolean => MODE === "local";
export const isCloud = (): boolean => MODE === "cloud";

/**
 * The sentinel user id used when MODE === "local". Lets every action take a
 * userId argument unconditionally and still keep the local flow single-user.
 */
export const LOCAL_USER_ID = "local-user";

/**
 * Module-level capability declaration. Each feature module's index.ts
 * exports its FeatureModule with an `availableIn` field; the registry
 * skips modules that aren't available in the current MODE.
 */
export interface ModuleManifest {
  name: string;
  availableIn: DeploymentMode[];
}

export function isModuleAvailable(manifest: ModuleManifest): boolean {
  return manifest.availableIn.includes(MODE);
}
