"use client";

import { mutate as globalMutate } from "swr";

/**
 * Client-side auto-reconnect coordinator.
 *
 * Multiple claw SWR hooks (sessions, cron, dm/status) all hit the remote
 * independently, so a half-dead tunnel produces N parallel 503 responses
 * per poll cycle. Without coordination each would race to fire its own
 * POST /api/claw/connect — a thundering herd that either hammers the
 * relay or stomps on the successful reconnect mid-flight.
 *
 * This module single-flights the reconnect: whoever hits `reconnectRequired`
 * first triggers a real connect; everyone else joins the same in-flight
 * promise. On success every claw SWR key is revalidated so stale 503s
 * drop off the screen immediately.
 *
 * The last-attempt timestamp also acts as a polling throttle. SWR hooks
 * can consult `isReconnectPending()` to skip their next revalidation
 * while a reconnect is in flight, which prevents the UI from firing
 * another doomed query against a known-dead tunnel.
 */

interface ReconnectState {
  inFlight: Map<string, Promise<boolean>>;
  lastAttemptAt: Map<string, number>;
  cooldownMs: number;
}

const globalKey = "__claw_client_reconnect" as const;
type GlobalWithReconnect = typeof globalThis & {
  [globalKey]?: ReconnectState;
};

function getState(): ReconnectState {
  const g = globalThis as GlobalWithReconnect;
  if (!g[globalKey]) {
    g[globalKey] = {
      inFlight: new Map(),
      lastAttemptAt: new Map(),
      // Short cooldown prevents retry storms when the remote is genuinely
      // offline — the UI gets one fresh attempt per ~5s instead of the
      // tight 30s SWR refresh loop hammering a dead endpoint.
      cooldownMs: 5_000,
    };
  }
  return g[globalKey]!;
}

function invalidateClawKeys(connectionId: string): void {
  const encoded = encodeURIComponent(connectionId);
  const keys = [
    `/api/claw/sessions?connectionId=${encoded}`,
    `/api/claw/cron?connectionId=${encoded}`,
    `/api/claw/dm/status?connectionId=${encoded}`,
    `/api/claw/command#channels-${connectionId}`,
    "/api/claw/connections",
  ];
  for (const key of keys) {
    globalMutate(key).catch(() => {
      // best-effort revalidation; SWR surfaces its own errors
    });
  }
}

/**
 * Request a reconnect for this connection. Returns the existing in-flight
 * promise when one exists so every caller awaits a single network round
 * trip. Returns `null` when the call is skipped due to cooldown — the
 * caller should treat this as "not my turn, keep the current error" and
 * let the next poll retry.
 */
export function requestReconnect(
  connectionId: string,
): Promise<boolean> | null {
  const state = getState();
  const existing = state.inFlight.get(connectionId);
  if (existing) return existing;

  const now = Date.now();
  const last = state.lastAttemptAt.get(connectionId) ?? 0;
  if (now - last < state.cooldownMs) return null;

  const promise = (async () => {
    state.lastAttemptAt.set(connectionId, Date.now());
    try {
      const res = await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && Boolean(data?.connected);
      if (ok) {
        // Let every claw-facing SWR key refetch against the fresh
        // tunnel. Without this the UI keeps showing the stale 503
        // response until the next natural revalidation fires.
        invalidateClawKeys(connectionId);
      }
      return ok;
    } catch {
      return false;
    } finally {
      state.inFlight.delete(connectionId);
    }
  })();

  state.inFlight.set(connectionId, promise);
  return promise;
}

export function isReconnectPending(connectionId: string): boolean {
  return getState().inFlight.has(connectionId);
}
