"use client";

import useSWR from "swr";
import { swrFetcher } from "./config";

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

// --- Bento dashboard / insights hooks ---

export function useDashboardInsights() {
  return useSWR("/api/dashboard/insights", swrFetcher, {
    refreshInterval: 60_000,
  });
}

export function useCardDetail(cardId: string | null) {
  return useSWR(
    cardId ? `/api/dashboard/insights?cardId=${encodeURIComponent(cardId)}&include=wiki` : null,
    swrFetcher,
  );
}
