import type { NextRequest } from "next/server";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * Public origin (scheme + host, no path) for this deployment.
 * Used to build `/api/agent` URLs for openclaw and UI copy helpers.
 *
 * Precedence:
 * 1. `NEXT_PUBLIC_APP_URL` — full origin with scheme (custom domains).
 * 2. Request `x-forwarded-host` / `host` + `x-forwarded-proto` when `request` is passed.
 * 3. `VERCEL_URL` — hostname only; normalized to `https://…`.
 * 4. Local fallback: `http://127.0.0.1:${PORT}` (default port 3000).
 */
export function resolvePublicAppOrigin(request?: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }
  if (request) {
    const rawHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (rawHost) {
      const host = rawHost.split(",")[0]?.trim() ?? rawHost;
      const xfProto = request.headers.get("x-forwarded-proto");
      const proto =
        xfProto ??
        (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
          ? "http"
          : "https");
      return `${proto}://${host}`;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function resolveAgentToolsHttpUrl(request?: NextRequest): string {
  return `${resolvePublicAppOrigin(request)}/api/agent`;
}

/**
 * Single line for openclaw transcripts (wiki ingest, chat).
 */
export function formatAgentToolHttpInstruction(request?: NextRequest): string {
  const url = resolveAgentToolsHttpUrl(request);
  return `Tool HTTP endpoint (readRawSources, publishDashboard, …): ${url}`;
}
