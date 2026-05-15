"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { DashboardCard, GenerativeBlock } from "@/lib/modules/dashboard/insights-types";

function Block({ block }: { block: GenerativeBlock }) {
  switch (block.t) {
    case "heading":
      return (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {block.text}
        </p>
      );
    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
      );
    case "bullets":
      return (
        <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "metric":
      return (
        <div className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
          <span className="text-[11px] text-muted-foreground">{block.label}</span>
          <span className="text-sm font-medium tabular-nums">{block.value}</span>
        </div>
      );
    case "callout": {
      const tone =
        block.tone === "warn"
          ? "border-amber-500/40 bg-amber-500/5"
          : block.tone === "success"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border bg-muted/30";
      return (
        <div
          className={cn(
            "rounded-lg border px-2.5 py-2 text-xs leading-relaxed text-foreground/90",
            tone,
          )}
        >
          {block.text}
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * Renders the agent-authored card content. Two distinct surfaces:
 *
 * - **tile**: prefers `summary` (short headline, no clamp needed). Falls
 *   back to a clamped view of `presentation.blocks` / `body` when no
 *   summary was provided.
 * - **sheet** (slide-in): always renders the full long-form content —
 *   `presentation.blocks` if structured, otherwise `body` (as Markdown
 *   when `richMarkdown`). If both `summary` and a long-form body exist,
 *   the summary leads as a subtitle line so the slide-in still opens
 *   with the same headline the tile showed.
 */
export function GenerativeCardBody({
  card,
  mode = "tile",
}: {
  card: DashboardCard;
  mode?: "tile" | "sheet";
}) {
  if (mode === "tile") {
    if (card.summary) {
      return (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {card.summary}
        </p>
      );
    }
    return <LongFormBody card={card} clamp="line-clamp-6" />;
  }

  // sheet
  const hasLongForm =
    (card.presentation?.blocks?.length ?? 0) > 0 || Boolean(card.body);
  return (
    <div className="flex flex-col gap-3">
      {card.summary && hasLongForm && (
        <p className="text-sm font-medium text-foreground/90 leading-snug">
          {card.summary}
        </p>
      )}
      <LongFormBody card={card} />
    </div>
  );
}

function LongFormBody({ card, clamp }: { card: DashboardCard; clamp?: string }) {
  const blocks = card.presentation?.blocks;
  if (blocks && blocks.length > 0) {
    return (
      <div className={cn("flex flex-col gap-2 min-h-0", clamp)}>
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    );
  }

  if (card.richMarkdown && card.body) {
    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_p]:my-1 [&_ul]:my-1 [&_li]:text-sm",
          clamp,
        )}
      >
        <ReactMarkdown>{card.body}</ReactMarkdown>
      </div>
    );
  }

  if (!card.body) {
    return card.summary ? (
      <p
        className={cn(
          "text-sm text-muted-foreground leading-relaxed whitespace-pre-line",
          clamp,
        )}
      >
        {card.summary}
      </p>
    ) : null;
  }

  return (
    <p
      className={cn(
        "text-sm text-muted-foreground leading-relaxed whitespace-pre-line",
        clamp,
      )}
    >
      {card.body}
    </p>
  );
}
