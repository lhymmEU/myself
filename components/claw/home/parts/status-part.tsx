"use client";

import { Activity, Moon, Power, Zap } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { StatusData } from "@/lib/claw-ai/parts";

interface StatusPartProps {
  data: StatusData;
  /** Compact pill variant for the hero. */
  variant?: "card" | "pill";
}

/**
 * Single source-of-truth renderer for `data-status` parts.
 * `variant="pill"` is what the home hero uses; `variant="card"`
 * is the inline message version.
 */
export function StatusPart({ data, variant = "card" }: StatusPartProps) {
  const t = useT();

  const meta = ((): { Icon: typeof Activity; label: string; tone: string } => {
    switch (data.state) {
      case "online":
        return {
          Icon: Activity,
          label: t("claw.parts.status.online"),
          tone: "text-emerald-500 bg-emerald-500/10",
        };
      case "working":
        return {
          Icon: Zap,
          label: data.task ?? t("claw.parts.status.working"),
          tone: "text-amber-500 bg-amber-500/10",
        };
      case "sleeping":
        return {
          Icon: Moon,
          label: t("claw.parts.status.sleeping"),
          tone: "text-sky-500 bg-sky-500/10",
        };
      case "offline":
      default:
        return {
          Icon: Power,
          label: t("claw.parts.status.offline"),
          tone: "text-zinc-500 bg-zinc-500/10",
        };
    }
  })();

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          meta.tone,
        )}
      >
        <meta.Icon className="h-3 w-3" />
        {meta.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          meta.tone,
        )}
      >
        <meta.Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{meta.label}</p>
        {data.lastSeen && (
          <p className="text-xs text-muted-foreground">
            Last seen {new Date(data.lastSeen).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
