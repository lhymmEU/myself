"use client";

import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { swrFetcher } from "./config";
import { createClient } from "@/lib/supabase/client";

export interface WikiIngestPayload {
  status: string;
  detail: string;
  updatedAt: number;
  generativeCardsJson?: string | null;
}

const WIKI_INGEST_PATH = "/api/dashboard/insights/wiki-ingest";
const INSIGHTS_PATH = "/api/dashboard/insights";

/**
 * Same data as a plain `useSWR(WIKI_INGEST_PATH)` call, but also subscribes
 * to the `wiki_ingest_state` row via Supabase Realtime. When the agent
 * writes a new set of cards, both this hook AND `useDashboardInsights()`
 * (which reads cards from the same row) revalidate immediately.
 */
export function useWikiIngestLive() {
  const swr = useSWR<WikiIngestPayload>(WIKI_INGEST_PATH, swrFetcher, {
    revalidateOnFocus: false,
  });
  const { mutate: globalMutate } = useSWRConfig();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("wiki-ingest-state-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wiki_ingest_state" },
        () => {
          // RLS restricts the change feed to this user's row.
          void globalMutate(WIKI_INGEST_PATH);
          void globalMutate(INSIGHTS_PATH);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [globalMutate]);

  return swr;
}
