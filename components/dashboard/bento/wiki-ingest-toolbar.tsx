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
import { useAgentRegistration } from "@/lib/swr/hooks";

interface WikiIngestPayload {
  status: "idle" | "processing" | "done" | "error";
  detail: string;
  updatedAt: number;
  generativeCardsJson?: string | null;
  agentConnected?: boolean;
  agentLastSeenAt?: number | null;
}

export function WikiIngestToolbar({
  onIngestFinished,
}: {
  onIngestFinished?: () => void;
}) {
  const {
    data: registration,
    error: registrationError,
    isLoading: registrationLoading,
    isValidating: registrationValidating,
    mutate: mutateRegistration,
  } = useAgentRegistration();

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<WikiIngestPayload>("/api/dashboard/insights/wiki-ingest", swrFetcher, {
      refreshInterval: (latestData) =>
        latestData?.status === "processing" ? 2000 : 0,
    });

  const status = data?.status ?? "idle";
  const detail = data?.detail ?? "";
  const agentConnected = registration?.connected === true;

  /** Set after POST succeeds so we refresh the bento even when status stays `done` (new `updatedAt`). */
  const pendingInsightRefresh = useRef(false);
  /** Highest `updatedAt` seen while `processing`; completion must advance past this. */
  const processingCheckpoint = useRef(0);
  const hydrated = useRef(false);

  const startIngest = useCallback(async () => {
    if (!agentConnected) {
      toast.error(
        "No agent watcher paired. Pair one under Settings → Agent.",
      );
      return;
    }
    try {
      const res = await fetch("/api/dashboard/insights/wiki-ingest", {
        method: "POST",
        credentials: "include",
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
      pendingInsightRefresh.current = true;
      toast.success("Wiki ingest queued — the agent watcher will pick it up.");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    }
  }, [agentConnected, mutate]);

  useEffect(() => {
    if (!data) return;
    const at = data.updatedAt ?? 0;
    const st = data.status;

    if (!hydrated.current) {
      hydrated.current = true;
      processingCheckpoint.current = at;
      return;
    }

    if (st === "processing") {
      processingCheckpoint.current = Math.max(processingCheckpoint.current, at);
      return;
    }

    if (
      pendingInsightRefresh.current &&
      (st === "done" || st === "error") &&
      at > processingCheckpoint.current
    ) {
      processingCheckpoint.current = at;
      pendingInsightRefresh.current = false;
      if (st === "done") {
        toast.success("Wiki ingest finished.");
      } else {
        toast.error("Wiki ingest failed — hover the status light for detail.");
      }
      void Promise.resolve(onIngestFinished?.());
    }
  }, [data, onIngestFinished]);

  const statusLabel =
    status === "processing"
      ? "Processing — the watcher is updating the wiki"
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
              disabled={
                !agentConnected ||
                registrationLoading ||
                status === "processing" ||
                !!registrationError
              }
              onClick={() => void startIngest()}
            >
              {status === "processing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : registrationLoading || isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Library className="h-3.5 w-3.5" />
              )}
              Wiki ingest
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {registrationError
              ? "Could not load agent watcher status. Use refresh or open Settings → Agent."
              : error
                ? "Could not load wiki ingest status. Use refresh or reload the page."
                : registrationLoading
                  ? "Loading agent watcher status…"
                  : agentConnected
                    ? "Pushes a regen.cards event; the agent watcher picks it up and rebuilds your dashboard cards."
                    : "Pair an agent watcher first (Settings → Agent)."}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() =>
                void Promise.all([
                  mutate(undefined, { revalidate: true }),
                  mutateRegistration(undefined, { revalidate: true }),
                ])
              }
              disabled={isValidating || registrationValidating}
              aria-label="Refresh wiki ingest status and agent watcher state"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  (isValidating || registrationValidating) && "animate-spin",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Refresh ingest status and watcher state
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
