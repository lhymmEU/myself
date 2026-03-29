"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/lib/i18n/context";
import type { AgentStatus, SessionTarget } from "./types";

interface AgentStatusBarProps {
  connectionId: string | null;
  connected: boolean;
  sessionTarget: SessionTarget | null;
}

export function AgentStatusBar({
  connectionId,
  connected,
  sessionTarget,
}: AgentStatusBarProps) {
  const t = useT();
  const [status, setStatus] = useState<AgentStatus>({
    online: false,
    health: "unknown",
  });

  const fetchStatus = useCallback(async () => {
    if (!connectionId || !connected) {
      setStatus({ online: false, health: "unknown" });
      return;
    }
    try {
      const res = await fetch(
        `/api/claw/dm/status?connectionId=${encodeURIComponent(connectionId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // keep current state
    }
  }, [connectionId, connected]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const dotColor = !connected
    ? "bg-zinc-400"
    : status.online
      ? status.health === "healthy"
        ? "bg-emerald-500"
        : status.health === "unhealthy"
          ? "bg-amber-500"
          : "bg-emerald-500"
      : "bg-red-500";

  const statusText = !connected
    ? t("claw.dm.status.offline")
    : status.online
      ? status.currentTask
        ? `${t("claw.dm.status.working")}: ${status.currentTask}`
        : t("claw.dm.status.online")
      : t("claw.dm.status.offline");

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm text-muted-foreground">{statusText}</span>
      </div>
      {sessionTarget && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {sessionTarget.label}
        </span>
      )}
    </div>
  );
}
