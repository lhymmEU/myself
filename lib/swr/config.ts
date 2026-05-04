"use client";

import { SWRConfig } from "swr";
import { requestReconnect } from "@/lib/modules/claw/client-reconnect";

export const swrFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error("Fetch failed");
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }
  return res.json();
};

/**
 * Fetcher used by claw hooks. When the server returns a 503 with the
 * `reconnectRequired` hint, we surface the JSON body (so the UI can keep
 * rendering a benign "reconnecting…" state) *and* kick off a single-flight
 * reconnect via the client coordinator. Other 4xx/5xx errors still throw
 * so SWR surfaces them through `error`.
 *
 * The extracted connectionId is parsed from the URL querystring because
 * that's what every claw route already uses as its cache key — we avoid
 * plumbing an extra argument through every hook.
 */
function extractConnectionId(url: string): string | null {
  try {
    const u = new URL(url, "http://localhost");
    return u.searchParams.get("connectionId");
  } catch {
    return null;
  }
}

export const clawFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (res.status === 503 && data?.reconnectRequired) {
    const connectionId = extractConnectionId(url);
    if (connectionId) {
      requestReconnect(connectionId);
    }
    // Return the body so components can render a soft "reconnecting"
    // state. SWR treats this as `data` rather than `error`, which stops
    // the red toast-style error banners from flapping each poll cycle.
    return data;
  }

  if (!res.ok) {
    const err = new Error(data?.error ?? "Fetch failed");
    (err as unknown as Record<string, unknown>).status = res.status;
    (err as unknown as Record<string, unknown>).data = data;
    throw err;
  }
  return data;
};

export const swrDefaults: React.ComponentProps<typeof SWRConfig>["value"] = {
  fetcher: swrFetcher,
  dedupingInterval: 10_000,
  revalidateOnFocus: true,
  revalidateIfStale: true,
  errorRetryCount: 2,
};
