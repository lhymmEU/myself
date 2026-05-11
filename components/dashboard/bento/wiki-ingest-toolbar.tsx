"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useClawConnectionsList } from "@/lib/swr/hooks";
import { CLAW_ACTIVE_CONNECTION_STORAGE_KEY } from "@/lib/claw/constants";

interface WikiIngestPayload {
  status: "idle" | "processing" | "done" | "error";
  detail: string;
  updatedAt: number;
  /** Legacy — prefer deriving eligibility from `/api/claw/connections` (same cache as Claw). */
  hasConnection?: boolean;
}

function readStoredClawConnectionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(CLAW_ACTIVE_CONNECTION_STORAGE_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export function WikiIngestToolbar({
  onIngestFinished,
}: {
  onIngestFinished?: () => void;
}) {
  const {
    data: connPayload,
    error: connError,
    isLoading: connLoading,
    mutate: mutateConnections,
    isValidating: connValidating,
  } = useClawConnectionsList();

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<WikiIngestPayload>("/api/dashboard/insights/wiki-ingest", swrFetcher, {
      refreshInterval: (latestData) =>
        latestData?.status === "processing" ? 2000 : 0,
    });

  /** Bumped from callbacks only — re-reads sessionStorage without setState-in-effect. */
  const [storageEpoch, setStorageEpoch] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setStorageEpoch((e) => e + 1);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const storedConnectionId = useMemo(() => {
    void storageEpoch;
    return readStoredClawConnectionId();
  }, [storageEpoch]);

  const connections = useMemo(
    () => connPayload?.connections ?? [],
    [connPayload?.connections],
  );
  const effectiveConnectionId = useMemo(() => {
    if (connections.length === 0) return null;
    if (
      storedConnectionId &&
      connections.some((c) => c.id === storedConnectionId)
    ) {
      return storedConnectionId;
    }
    const def = connections.find((c) => c.isDefault);
    return def?.id ?? connections[0]!.id;
  }, [connections, storedConnectionId]);

  const status = data?.status ?? "idle";
  const hasConnection = connections.length > 0;
  const detail = data?.detail ?? "";

  const disableForMissingConnection =
    !connLoading &&
    connPayload !== undefined &&
    !hasConnection &&
    !connError;

  /** Set after POST succeeds so we refresh the bento even when status stays `done` (new `updatedAt`). */
  const pendingInsightRefresh = useRef(false);
  /** Highest `updatedAt` seen while `processing`; completion must advance past this. */
  const processingCheckpoint = useRef(0);
  const hydrated = useRef(false);

  const startIngest = useCallback(async () => {
    if (!effectiveConnectionId) {
      toast.error(
        "No SSH connection to use. Open Dashboard → Claw and save a connection.",
      );
      return;
    }
    try {
      const res = await fetch("/api/dashboard/insights/wiki-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionId: effectiveConnectionId }),
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
      toast.success("Wiki ingest started — running in the background.");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    }
  }, [effectiveConnectionId, mutate]);

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
              disabled={
                disableForMissingConnection ||
                connLoading ||
                status === "processing" ||
                !!connError
              }
              onClick={() => void startIngest()}
            >
              {status === "processing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : connLoading || isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Library className="h-3.5 w-3.5" />
              )}
              Wiki ingest
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {connError
              ? "Could not load Claw connections. Use refresh or open Dashboard → Claw."
              : error
                ? "Could not load wiki ingest status. Use refresh or reload the page."
                : connLoading
                  ? "Loading your Claw SSH connections…"
                  : hasConnection
                    ? "Uses the same SSH connection as Claw chat when you have opened Claw in this browser (or your default). Runs openclaw on the remote host; up to ~15 min."
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
              onClick={() =>
                void Promise.all([
                  mutate(undefined, { revalidate: true }),
                  mutateConnections(undefined, { revalidate: true }),
                ]).then(() => {
                  setStorageEpoch((e) => e + 1);
                })
              }
              disabled={isValidating || connValidating}
              aria-label="Refresh wiki ingest status and Claw connections"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  (isValidating || connValidating) && "animate-spin",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Refresh ingest status and Claw connection list
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
