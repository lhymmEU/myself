"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { swrFetcher, clawFetcher } from "./config";
import {
  isReconnectPending,
  requestReconnect,
} from "@/lib/modules/claw/client-reconnect";

// --- Claw hooks (remote data — slower, cache longer) ---

/**
 * Shared config applied to every claw poll-style hook. When the client
 * coordinator is actively attempting a reconnect we skip the next
 * revalidation so we don't stack another doomed request against a tunnel
 * that's already known-dead. After the reconnect resolves the
 * coordinator triggers a `mutate` for these keys and polling resumes.
 */
function clawSWRConfig(
  connectionId: string | null,
  base: SWRConfiguration,
): SWRConfiguration {
  return {
    ...base,
    isPaused: () =>
      connectionId ? isReconnectPending(connectionId) : false,
  };
}

export function useClawSessions(connectionId: string | null, connected?: boolean) {
  return useSWR(
    connectionId && connected !== false
      ? `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`
      : null,
    clawFetcher,
    clawSWRConfig(connectionId, {
      dedupingInterval: 30_000,
      revalidateOnFocus: true,
    }),
  );
}

export function useClawCronJobs(connectionId: string | null) {
  return useSWR(
    connectionId
      ? `/api/claw/cron?connectionId=${encodeURIComponent(connectionId)}`
      : null,
    clawFetcher,
    clawSWRConfig(connectionId, {
      dedupingInterval: 30_000,
      revalidateOnFocus: true,
    }),
  );
}

export function useClawChannels(connectionId: string | null) {
  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, command: "channels-list" }),
    });
    const data = await res.json().catch(() => ({}));
    // Mirror the clawFetcher contract: on a reconnectRequired 503 we
    // kick off a coordinated reconnect and fall back to the built-in
    // defaults so the channel dropdown stays usable during recovery.
    if (res.status === 503 && data?.reconnectRequired) {
      if (connectionId) requestReconnect(connectionId);
      return ["whatsapp", "telegram", "discord", "imessage", "slack", "qqbot"];
    }
    if (!res.ok) throw new Error("Failed to fetch channels");
    const output: string = data.stdout || "";
    const lines = output
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);
    const channels: string[] = [];
    for (const line of lines) {
      const match = line.match(/^[-•*]?\s*(\S+)/);
      if (match) channels.push(match[1].toLowerCase());
    }
    return channels.length > 0
      ? channels
      : ["whatsapp", "telegram", "discord", "imessage", "slack", "qqbot"];
  };

  return useSWR(
    connectionId ? `/api/claw/command#channels-${connectionId}` : null,
    fetcher,
    clawSWRConfig(connectionId, { dedupingInterval: 120_000 }),
  );
}

export function useAgentStatus(
  connectionId: string | null,
  connected: boolean,
  config?: SWRConfiguration,
) {
  return useSWR(
    connectionId && connected
      ? `/api/claw/dm/status?connectionId=${encodeURIComponent(connectionId)}`
      : null,
    clawFetcher,
    clawSWRConfig(connectionId, { refreshInterval: 30_000, ...config }),
  );
}

export function useClawConnections() {
  return useSWR("/api/claw/connections", swrFetcher, {
    dedupingInterval: 30_000,
  });
}

/**
 * Server-persisted friendly names + pin state for openclaw chat
 * sessions. Replaces the legacy `localStorage` blob so renames travel
 * across devices.
 */
export function useClawSessionMeta(connectionId: string | null) {
  return useSWR<{
    records: Array<{
      id: string;
      connectionId: string;
      agentId: string;
      sessionId: string;
      name: string | null;
      pinnedAt: number | null;
      createdAt: number;
      updatedAt: number;
    }>;
  }>(
    connectionId
      ? `/api/claw/sessions/meta?connectionId=${encodeURIComponent(connectionId)}`
      : "/api/claw/sessions/meta",
    swrFetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: true },
  );
}

// --- Dashboard hooks (local SQLite — fast) ---

export function useWishlist() {
  return useSWR("/api/dashboard/wishlist", swrFetcher);
}

export function useWishTodos(wishId: string | null) {
  return useSWR(
    wishId ? `/api/dashboard/wishlist/todos?wishId=${encodeURIComponent(wishId)}` : null,
    swrFetcher,
  );
}

export function useUserSkills() {
  return useSWR("/api/dashboard/skills", swrFetcher);
}

export function useAssignedJobs() {
  return useSWR("/api/dashboard/jobs", swrFetcher);
}

export function useCharacterAppearance(type: string) {
  return useSWR(
    `/api/dashboard/appearance?type=${encodeURIComponent(type)}`,
    swrFetcher,
    { dedupingInterval: 60_000 },
  );
}

// --- Plans hooks ---

export function usePlanList() {
  return useSWR("/api/plans?action=list", swrFetcher);
}

export function usePlanFolders() {
  return useSWR("/api/plans/folders", swrFetcher);
}

export function usePlanAttachments(planId: string | null) {
  return useSWR(
    planId ? `/api/plans/attachments?planId=${encodeURIComponent(planId)}` : null,
    swrFetcher,
  );
}

export function usePlansByLinkedNodes(ids: string[]) {
  // Sort to keep the SWR key stable regardless of input order. A trailing
  // delimiter on the empty case lets `null` short-circuit the request entirely.
  const key =
    ids.length > 0
      ? `/api/plans?action=byLinkedNodes&ids=${encodeURIComponent(
          [...ids].sort().join(","),
        )}`
      : null;
  return useSWR(key, swrFetcher);
}

// --- Finance / OpenBB hooks ---

export function useOpenBB<T = unknown>(
  endpoint: string | null,
  params?: Record<string, string>,
) {
  const qs = new URLSearchParams({ endpoint: endpoint ?? "", ...params });
  return useSWR<T>(
    endpoint ? `/api/finance/openbb?${qs}` : null,
    swrFetcher,
    { dedupingInterval: 30_000 },
  );
}

// --- Mind Map hooks ---

export function useMindMapScenes(mode: string) {
  return useSWR(
    `/api/mind-map?all=true&mode=${encodeURIComponent(mode)}`,
    swrFetcher,
  );
}

// --- Todo hooks ---

export function useTodoSource() {
  return useSWR("/api/mind-map?todoSource=true", swrFetcher);
}

// --- Marked hooks ---

export function useMarkedCollections() {
  return useSWR("/api/marked?entity=collection", swrFetcher);
}

export function useMarkedItems(collectionId?: string | null) {
  const params = collectionId
    ? `&collectionId=${encodeURIComponent(collectionId)}`
    : "";
  return useSWR(`/api/marked?entity=item${params}`, swrFetcher);
}
