"use client";

import { useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { Loader2, RefreshCw, Library } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { swrFetcher } from "@/lib/swr/config";

interface WikiIngestPayload {
  status: "idle" | "processing" | "done" | "error";
  detail: string;
  updatedAt: number;
  hasConnection: boolean;
}

export function WikiIngestToolbar({
  onIngestFinished,
}: {
  onIngestFinished?: () => void;
}) {
  const { data, mutate, isValidating } = useSWR<WikiIngestPayload>(
    "/api/dashboard/insights/wiki-ingest",
    swrFetcher,
    {
      refreshInterval: (latestData) =>
        latestData?.status === "processing" ? 2000 : 0,
    },
  );

  const status = data?.status ?? "idle";
  const hasConnection = data?.hasConnection ?? false;
  const detail = data?.detail ?? "";

  const startIngest = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/insights/wiki-ingest", {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.message(body.error ?? "Already running");
        await mutate();
        return;
      }
      if (!res.ok) {
        toast.error(body.error ?? "Could not start wiki ingest");
        return;
      }
      toast.success("Wiki ingest started — running in the background.");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    }
  }, [mutate]);

  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (prevStatus.current === null) {
      prevStatus.current = status;
      return;
    }
    const was = prevStatus.current;
    prevStatus.current = status;
    if (was === "processing" && status === "done") {
      toast.success("Wiki ingest finished.");
      onIngestFinished?.();
    }
    if (was === "processing" && status === "error") {
      toast.error("Wiki ingest failed — hover the status light for detail.");
      onIngestFinished?.();
    }
  }, [status, onIngestFinished]);

  const statusLabel =
    status === "processing"
      ? "Processing — openclaw is updating the wiki"
      : status === "done"
        ? "Last run succeeded"
        : status === "error"
          ? "Last run failed — check detail or retry"
          : "Idle — run wiki ingest to refresh cards";

  const lightClass =
    status === "processing"
      ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)] animate-pulse"
      : status === "done"
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
        : status === "error"
          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
          : "bg-muted-foreground/35";

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-full border bg-background/80 px-2 py-1 pr-1 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="status"
              aria-label={statusLabel}
              className={cn(
                "inline-block h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                lightClass,
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{statusLabel}</p>
            {detail ? (
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {detail}
              </p>
            ) : null}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-3"
              disabled={!hasConnection || status === "processing"}
              onClick={() => void startIngest()}
            >
              {status === "processing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Library className="h-3.5 w-3.5" />
              )}
              Wiki ingest
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasConnection
              ? "Runs openclaw on the SSH host. When finished, the agent must print a MYSELF_DASHBOARD_JSON block in stdout (see wiki-maintainer preamble). Up to ~15 min; this page returns immediately."
              : "Configure a Claw SSH connection first (Dashboard → Claw)."}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => void mutate()}
              disabled={isValidating}
              aria-label="Refresh wiki ingest status"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isValidating && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh status</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
