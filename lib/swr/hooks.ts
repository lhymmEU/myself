"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { swrFetcher } from "./config";

// --- Claw hooks (remote data — slower, cache longer) ---

export function useClawSessions(connectionId: string | null, connected?: boolean) {
  return useSWR(
    connectionId && connected !== false
      ? `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`
      : null,
    swrFetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: true },
  );
}

export function useClawCronJobs(connectionId: string | null) {
  return useSWR(
    connectionId
      ? `/api/claw/cron?connectionId=${encodeURIComponent(connectionId)}`
      : null,
    swrFetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: true },
  );
}

export function useClawChannels(connectionId: string | null) {
  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, command: "channels-list" }),
    });
    if (!res.ok) throw new Error("Failed to fetch channels");
    const data = await res.json();
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
    { dedupingInterval: 120_000 },
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
    swrFetcher,
    { refreshInterval: 30_000, ...config },
  );
}

export function useClawConnections() {
  return useSWR("/api/claw/connections", swrFetcher, {
    dedupingInterval: 30_000,
  });
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
