"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Sparkles,
} from "lucide-react";
import { useDashboardInsights } from "@/lib/swr/hooks";
import { useWikiIngestLive } from "@/lib/swr/use-wiki-ingest-live";
import { summarizeGenerativePayload } from "@/lib/modules/dashboard/client-parse-generative-cards";
import { BentoCard } from "./bento-card";
import { CardDetailSheet } from "./card-detail-sheet";
import { GoalPinBar } from "./goal-pin-bar";
import { IngestDropzone } from "./ingest-dropzone";
import { AskTheWiki } from "./ask-the-wiki";
import { WikiIngestToolbar } from "./wiki-ingest-toolbar";
import { sortDashboardCardsForBento } from "./visual";
import type { DashboardCard, PinnedQuery } from "./types";

interface InsightsResponse {
  cards: DashboardCard[];
  pinned: PinnedQuery[];
}

export function BentoDashboard() {
  const { data, isLoading, mutate } = useDashboardInsights();
  const { data: ingestPayload } = useWikiIngestLive();
  const genSummary = useMemo(
    () =>
      summarizeGenerativePayload(ingestPayload?.generativeCardsJson ?? null),
    [ingestPayload?.generativeCardsJson],
  );
  const payload = data as InsightsResponse | undefined;
  const cards: DashboardCard[] = useMemo(
    () => payload?.cards ?? [],
    [payload],
  );
  const pinnedQueries: PinnedQuery[] = useMemo(
    () => payload?.pinned ?? [],
    [payload],
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [hoveredEvidence, setHoveredEvidence] =
    useState<ReadonlySet<string> | null>(null);
  const [pinnedGoalId, setPinnedGoalId] = useState<string | null>(null);

  // Single tick that drives the freshness ring + age label across the bento.
  // Hoisted up here so child renders stay pure. Lazy initial state keeps
  // render itself impurity-free (no Date.now() during render).
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const onHover = (card: DashboardCard | null) => {
    if (!card) {
      setHoveredEvidence(null);
      return;
    }
    const ids = new Set<string>(card.sources.map((s) => s.id));
    setHoveredEvidence(ids);
  };

  const visibleCards = useMemo(
    () => sortDashboardCardsForBento(cards, pinnedGoalId),
    [cards, pinnedGoalId],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3 sm:px-8">
        <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground min-w-0 flex-1">
          Eagle view of your wishes, wiki, and recent activity — refreshed each
          wiki ingest.
        </p>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <WikiIngestToolbar
            onIngestFinished={() =>
              void mutate(undefined, { revalidate: true })
            }
          />
          <AskTheWiki onPinned={() => mutate()} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <IngestDropzone onIngested={() => mutate()}>
          <div className="px-6 sm:px-8 py-6 space-y-6">
            <GoalPinBar
              activeGoalId={pinnedGoalId}
              onPin={setPinnedGoalId}
            />

            {genSummary.blockCount > 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-2">
                Generative layout:{" "}
                <span className="font-medium text-foreground">
                  {genSummary.blockCount}
                </span>{" "}
                block(s) across{" "}
                <span className="font-medium text-foreground">
                  {genSummary.cardCount}
                </span>{" "}
                card(s) — parsed client-side from the last ingest payload.
              </p>
            ) : null}

            {isLoading && cards.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <EmptyState pinnedQueries={pinnedQueries} />
            ) : (
              <div
                className="grid gap-4 auto-rows-[160px]"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                }}
              >
                {visibleCards.map((card) => (
                  <BentoCard
                    key={card.id}
                    card={card}
                    now={now}
                    evidenceActiveIds={hoveredEvidence ?? undefined}
                    dimmed={
                      pinnedGoalId
                        ? card.pinnedGoalId !== pinnedGoalId
                        : false
                    }
                    onClick={(c) => setActiveCardId(c.id)}
                    onHover={onHover}
                  />
                ))}
              </div>
            )}
          </div>
        </IngestDropzone>
      </div>

      <CardDetailSheet
        cardId={activeCardId}
        onOpenChange={(open) => !open && setActiveCardId(null)}
        onAfterVerb={() => mutate()}
      />
    </div>
  );
}

function EmptyState({ pinnedQueries }: { pinnedQueries: PinnedQuery[] }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="h-5 w-5 text-muted-foreground mx-auto" />
      <h3 className="mt-3 text-base font-semibold">Your bento is empty.</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
        Add a goal in <span className="font-medium">Plans</span>, clip URLs to{" "}
        <span className="font-medium">Marked</span>, connect{" "}
        <span className="font-medium">Claw</span>, then use{" "}
        <span className="font-medium">Wiki ingest</span> above — openclaw runs
        in the background (no timeout) and writes{" "}
        <span className="font-mono text-xs">cards.json</span> on the OpenClaw
        host; the app pulls that file into this grid.
      </p>
      {pinnedQueries.length > 0 && (
        <div className="mt-6 text-left max-w-md mx-auto space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Pinned questions
          </p>
          <ul className="space-y-1.5">
            {pinnedQueries.map((q) => (
              <li
                key={q.id}
                className="text-sm text-foreground/80 truncate"
                title={q.question}
              >
                · {q.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
