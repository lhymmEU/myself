"use client";

import { useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  CircleDashed,
  HelpCircle,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  freshnessDecay,
  bentoSpanForCard,
  confidenceLabel,
  kindLabel,
  ingestSlotDisplayLabel,
} from "./visual";
import type {
  DashboardCard,
  CardKind,
} from "./types";

const KIND_ICON: Record<CardKind, LucideIcon> = {
  synthesis: Sparkles,
  lint: AlertTriangle,
  gap: CircleDashed,
  query: HelpCircle,
  heartbeat: Activity,
};

interface BentoCardProps {
  card: DashboardCard;
  /** Source ids that the user is currently hovering — used for the cross-evidence glow. */
  evidenceActiveIds?: ReadonlySet<string>;
  /** Whether this card matches the active goal pin (or no goal pinned). */
  dimmed?: boolean;
  /**
   * Reference time the parent passes in. Hoisted so the render stays
   * pure; the parent ticks it every minute via setInterval.
   */
  now: number;
  onClick?: (card: DashboardCard) => void;
  onHover?: (card: DashboardCard | null) => void;
}

export function BentoCard({
  card,
  evidenceActiveIds,
  dimmed,
  now,
  onClick,
  onHover,
}: BentoCardProps) {
  const span = bentoSpanForCard(card.kind, card.ingestSlot);
  const slotLabel = ingestSlotDisplayLabel(card.ingestSlot);
  const Icon = KIND_ICON[card.kind] ?? Sparkles;

  const decay = freshnessDecay(card.freshness, 14, now);
  const ringStops = useMemo(
    () => Math.round(decay * 100),
    [decay],
  );

  const sharesEvidence = useMemo(() => {
    if (!evidenceActiveIds || evidenceActiveIds.size === 0) return false;
    return card.sources.some((s) => evidenceActiveIds.has(s.id));
  }, [card.sources, evidenceActiveIds]);

  const confidenceDot = (() => {
    switch (card.confidence) {
      case "strong":
        return (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-foreground"
            aria-label={`Confidence: ${confidenceLabel(card.confidence)}`}
          />
        );
      case "thin":
        return (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full border border-foreground"
            aria-label={`Confidence: ${confidenceLabel(card.confidence)}`}
          />
        );
      case "contradicted":
        return (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background:
                "repeating-linear-gradient(45deg,currentColor,currentColor 1px,transparent 1px,transparent 2px)",
            }}
            aria-label={`Confidence: ${confidenceLabel(card.confidence)}`}
          />
        );
      default:
        return (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full border border-muted-foreground/50"
            aria-label="Confidence: unknown"
          />
        );
    }
  })();

  return (
    <button
      type="button"
      data-card-kind={card.kind}
      data-shares-evidence={sharesEvidence ? "true" : undefined}
      onClick={() => onClick?.(card)}
      onMouseEnter={() => onHover?.(card)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative flex flex-col text-left rounded-2xl border bg-card text-card-foreground overflow-hidden",
        "transition-[opacity,transform,box-shadow] duration-300 ease-out",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        dimmed && "opacity-50",
        sharesEvidence && "ring-2 ring-offset-2 ring-offset-background",
      )}
      style={
        {
          // CSS Grid spans
          gridColumn: `span ${span.col} / span ${span.col}`,
          gridRow: `span ${span.row} / span ${span.row}`,
          // Goal hue applied as a subtle ribbon and as the ring accent for evidence.
          ["--card-hue" as string]: `${card.hue}`,
          ringColor: `oklch(0.7 0.15 var(--card-hue))`,
        } as React.CSSProperties
      }
    >
      {/* Hue ribbon (left edge) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{
          background: `linear-gradient(180deg, oklch(0.75 0.15 var(--card-hue)) 0%, oklch(0.55 0.13 var(--card-hue)) 100%)`,
        }}
      />

      {/* Freshness ring (top-right corner) */}
      <span
        aria-hidden
        className="absolute right-3 top-3 grid place-items-center h-6 w-6 rounded-full"
        style={{
          background: `conic-gradient(oklch(0.65 0.15 var(--card-hue)) ${ringStops}%, transparent ${ringStops}%)`,
        }}
      >
        <span className="h-4 w-4 rounded-full bg-card" />
      </span>

      <header className="px-5 pt-4 pb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-0">
          {slotLabel ? (
            <span className="flex flex-col gap-0.5 leading-tight">
              <span>{slotLabel}</span>
              <span className="text-[9px] font-normal opacity-80 normal-case tracking-normal">
                {kindLabel(card.kind)}
              </span>
            </span>
          ) : (
            kindLabel(card.kind)
          )}
        </span>
        <span className="ml-auto pr-7 flex items-center gap-1.5 text-muted-foreground">
          {confidenceDot}
        </span>
      </header>

      <div className="px-5 pb-4 flex flex-col gap-2 flex-1 min-h-0">
        <h3 className="text-base font-semibold leading-snug line-clamp-3">
          {card.title}
        </h3>
        {card.body && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-line">
            {card.body}
          </p>
        )}
      </div>

      {card.sources.length > 0 && (
        <footer className="px-5 pb-4 pt-1 mt-auto flex flex-wrap gap-1">
          {card.sources.slice(0, 3).map((s, i) => (
            <span
              key={`${s.kind}:${s.id}:${i}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground"
            >
              {s.label ?? `${s.kind}:${s.id.slice(0, 6)}`}
            </span>
          ))}
          {card.sources.length > 3 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/40 text-[10px] text-muted-foreground">
              +{card.sources.length - 3}
            </span>
          )}
        </footer>
      )}
    </button>
  );
}
