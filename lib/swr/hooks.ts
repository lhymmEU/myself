"use client";

import useSWR from "swr";
import { swrFetcher } from "./config";

// --- Dashboard hooks (local SQLite — fast) ---

export function useUserWishes() {
  return useSWR("/api/dashboard/wishes", swrFetcher);
}

export function useClawConnectionsList() {
  return useSWR<{ connections: { id: string; name: string; isDefault?: boolean }[] }>(
    "/api/claw/connections",
    swrFetcher,
  );
}

export function useUserSkills() {
  return useSWR("/api/dashboard/skills", swrFetcher);
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
    cardId ? `/api/dashboard/insights?cardId=${encodeURIComponent(cardId)}` : null,
    swrFetcher,
  );
}
