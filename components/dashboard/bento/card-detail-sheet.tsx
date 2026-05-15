"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Archive,
  ExternalLink,
} from "lucide-react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCardDetail } from "@/lib/swr/hooks";
import { cn } from "@/lib/utils";
import {
  confidenceLabel,
  freshnessDecay,
  kindLabel,
} from "./visual";
import { GenerativeCardBody } from "./generative-card-body";
import type { CardVerb, DashboardCard, SourceRef } from "./types";

interface Props {
  cardId: string | null;
  onOpenChange: (open: boolean) => void;
  onAfterVerb?: (verb: CardVerb) => void;
}

interface DetailResponse {
  card: DashboardCard;
}

export function CardDetailSheet({
  cardId,
  onOpenChange,
  onAfterVerb,
}: Props) {
  const { data, isLoading } = useCardDetail(cardId);
  const detail = data as DetailResponse | undefined;

  // Tick that drives the freshness label. Re-renders every minute; we seed
  // it lazily from useState's initialiser so the render itself stays pure.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const ageLabel = useMemo(() => {
    if (!detail?.card?.freshness) return "—";
    const decay = freshnessDecay(detail.card.freshness, 14, now);
    const ageMs = now - detail.card.freshness;
    const ageDays = Math.max(0, Math.round(ageMs / (1000 * 60 * 60 * 24)));
    if (ageDays === 0) return `Today · freshness ${(decay * 100).toFixed(0)}%`;
    if (ageDays === 1) return `1 day ago · freshness ${(decay * 100).toFixed(0)}%`;
    return `${ageDays} days ago · freshness ${(decay * 100).toFixed(0)}%`;
  }, [detail?.card?.freshness, now]);

  async function runVerb(verb: CardVerb) {
    if (!cardId) return;
    try {
      const res = await fetch("/api/dashboard/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, verb }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to record action");
        return;
      }
      toast.success(`Recorded: ${verb}.`);
      // Re-fetch the dashboard list and detail.
      await Promise.all([
        globalMutate("/api/dashboard/insights"),
        globalMutate(
          `/api/dashboard/insights?cardId=${encodeURIComponent(cardId)}`,
        ),
      ]);
      onAfterVerb?.(verb);
      if (verb === "archive" || verb === "dismiss") {
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    }
  }

  const open = cardId !== null;
  const card = detail?.card;
  const sources = card?.sources ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl flex flex-col gap-0"
      >
        {isLoading || !card ? (
          <div className="flex-1 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>{kindLabel(card.kind)}</span>
                <span aria-hidden>·</span>
                <span>{confidenceLabel(card.confidence)}</span>
                <span aria-hidden>·</span>
                <span>{ageLabel}</span>
              </div>
              <SheetTitle className="text-lg leading-snug pr-6">
                {card.title}
              </SheetTitle>
              {(card.presentation?.blocks?.length ||
                card.richMarkdown ||
                card.body) && (
                <SheetDescription asChild>
                  <div className="text-muted-foreground">
                    <GenerativeCardBody card={card} mode="sheet" />
                  </div>
                </SheetDescription>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-5">
                <ProvenanceList sources={sources} />
                <p className="text-sm text-muted-foreground">
                  Long-form notes and the LLM wiki live on your OpenClaw host
                  only. This panel shows the card summary and provenance chips
                  above; run wiki ingest from the dashboard to refresh tiles
                  from that vault.
                </p>
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border flex-row flex-wrap items-center gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runVerb("confirm")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Still true
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runVerb("contradict")}
              >
                <XCircle className="h-4 w-4" />
                Contradict
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runVerb("expand")}
              >
                <Sparkles className="h-4 w-4" />
                Expand
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => runVerb("archive")}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProvenanceList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        No provenance sources cited.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Provenance
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <SourceChip key={`${s.kind}:${s.id}:${i}`} source={s} />
        ))}
      </div>
    </div>
  );
}

function SourceChip({ source }: { source: SourceRef }) {
  const href = (() => {
    if (source.kind === "plan") {
      return `/dashboard/plans?id=${encodeURIComponent(source.id)}`;
    }
    if (source.kind === "marked") {
      return `/dashboard/marked?id=${encodeURIComponent(source.id)}`;
    }
    return null;
  })();
  const label =
    source.label ??
    (source.kind && source.id
      ? `${source.kind}:${source.id.slice(0, 8)}`
      : "source");
  const inner = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs font-mono cursor-pointer",
        href && "hover:bg-muted",
      )}
    >
      {label}
      {href && <ExternalLink className="h-3 w-3" />}
    </Badge>
  );
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}
