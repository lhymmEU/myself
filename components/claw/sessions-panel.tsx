"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Users,
  Server,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  CheckCheck,
  HelpCircle,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface SessionsPanelProps {
  connectionId: string | null;
  connected: boolean;
}

interface SessionEntry {
  agentId?: string;
  key?: string;
  model?: string;
  createdAt?: string;
  lastActive?: string;
  messageCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  diskBytes?: number;
  status?: string;
}

interface SessionsData {
  count?: number;
  sessions?: SessionEntry[];
  stores?: { agentId: string; path: string }[];
  raw: string;
}

export function SessionsPanel({ connectionId, connected }: SessionsPanelProps) {
  const t = useT();
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailSession, setDetailSession] = useState<SessionEntry | null>(null);

  const sessionKeys = useMemo(
    () => (data?.sessions ?? []).map((s) => s.key ?? "").filter(Boolean),
    [data?.sessions]
  );

  const allSelected =
    sessionKeys.length > 0 && sessionKeys.every((k) => selected.has(k));

  const refresh = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`
      );
      const result = await res.json();
      setData({
        count: result.count,
        sessions: result.sessions,
        stores: result.stores,
        raw: result.raw ?? "",
      });
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const deleteSelected = useCallback(async () => {
    if (!connectionId || !connected || selected.size === 0) return;
    setDeleting(true);
    try {
      await fetch("/api/claw/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, keys: Array.from(selected) }),
      });
      await refresh();
    } finally {
      setDeleting(false);
    }
  }, [connectionId, connected, selected, refresh]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessionKeys));
    }
  }, [allSelected, sessionKeys]);

  useEffect(() => {
    if (connected) refresh();
    else {
      setData(null);
      setSelected(new Set());
    }
  }, [connected, refresh]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t("claw.sessions.connectToManage")}</p>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {t("common.refresh")}
        </Button>

        {sessions.length > 0 && (
          <>
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {allSelected ? (
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              )}
              {allSelected ? t("claw.sessions.deselectAll") : t("claw.sessions.selectAll")}
            </Button>

            {selected.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteSelected}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                {`${t("claw.sessions.deleteSelected")} (${selected.size})`}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Session count */}
      {data?.count !== undefined && (
        <p className="text-sm text-muted-foreground">
          {t("claw.sessions.totalSessions")}{" "}
          <span className="font-medium text-foreground">{data.count}</span>
        </p>
      )}

      {/* 3-column grid, scrollable at ~3 rows */}
      {sessions.length > 0 ? (
        <div className="max-h-[420px] overflow-y-auto rounded-md border p-3">
          <div className="grid grid-cols-3 gap-3">
            {sessions.map((s, i) => {
              const key = s.key ?? `session-${i}`;
              const isSelected = selected.has(key);

              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : ""
                  }`}
                  onClick={() => setDetailSession(s)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(key);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {s.agentId ?? t("common.session")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {s.key && (
                      <p className="text-xs font-mono text-zinc-400 truncate">
                        {s.key}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.model && (
                        <Badge variant="secondary" className="text-xs">
                          {s.model}
                        </Badge>
                      )}
                      {(s.inputTokens !== undefined || s.outputTokens !== undefined) && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {((s.inputTokens ?? 0) + (s.outputTokens ?? 0)).toLocaleString()} {t("common.tokens")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("claw.sessions.noSessionsFound")}
          </p>
        )
      )}

      {/* Session detail dialog */}
      <Dialog
        open={!!detailSession}
        onOpenChange={(open) => {
          if (!open) setDetailSession(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {detailSession?.agentId ?? t("claw.sessions.sessionDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("claw.sessions.sessionInfo")}
            </DialogDescription>
          </DialogHeader>

          {detailSession && (
            <div className="space-y-3 text-sm">
              <DetailRow label={t("claw.sessions.agentId")} value={detailSession.agentId} />
              <DetailRow label={t("claw.sessions.key")} value={detailSession.key} mono truncateWithTooltip />
              <DetailRow label={t("claw.sessions.model")} value={detailSession.model} />
              <DetailRow label={t("common.status")} value={detailSession.status} />
              <DetailRow label={t("claw.sessions.created")} value={detailSession.createdAt} />
              <DetailRow label={t("claw.sessions.lastActive")} value={detailSession.lastActive} />
              {detailSession.messageCount !== undefined && (
                <DetailRow
                  label={t("claw.sessions.messages")}
                  value={String(detailSession.messageCount)}
                />
              )}
              {detailSession.inputTokens !== undefined && (
                <DetailRow
                  label={t("claw.sessions.inputTokens")}
                  value={detailSession.inputTokens.toLocaleString()}
                  hint={t("claw.sessions.inputTokensHint")}
                />
              )}
              {detailSession.outputTokens !== undefined && (
                <DetailRow
                  label={t("claw.sessions.outputTokens")}
                  value={detailSession.outputTokens.toLocaleString()}
                  hint={t("claw.sessions.outputTokensHint")}
                />
              )}
              {(detailSession.inputTokens !== undefined || detailSession.outputTokens !== undefined) && (
                <DetailRow
                  label={t("claw.sessions.totalUsage")}
                  value={((detailSession.inputTokens ?? 0) + (detailSession.outputTokens ?? 0)).toLocaleString()}
                  hint={t("claw.sessions.totalUsageHint")}
                />
              )}
              {detailSession.totalTokens !== undefined && (
                <DetailRow
                  label={t("claw.sessions.contextUtilization")}
                  value={detailSession.totalTokens.toLocaleString()}
                  hint={t("claw.sessions.contextUtilizationHint")}
                />
              )}
              {detailSession.diskBytes !== undefined && (
                <DetailRow
                  label={t("claw.sessions.diskUsage")}
                  value={formatBytes(detailSession.diskBytes)}
                />
              )}
            </div>
          )}

          <DialogFooter>
            {detailSession?.key && (
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={async () => {
                  if (!connectionId || !detailSession.key) return;
                  setDeleting(true);
                  try {
                    await fetch("/api/claw/sessions", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        connectionId,
                        keys: [detailSession.key],
                      }),
                    });
                    setDetailSession(null);
                    await refresh();
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t("claw.sessions.deleteSession")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  truncateWithTooltip,
  hint,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  truncateWithTooltip?: boolean;
  hint?: string;
}) {
  if (!value) return null;

  const valueEl = (
    <span
      className={`text-right truncate max-w-[260px] ${mono ? "font-mono text-xs" : ""}`}
    >
      {value}
    </span>
  );

  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0 flex items-center gap-1">
        {label}
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
      {truncateWithTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{valueEl}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-all font-mono text-xs">
              {value}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        valueEl
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
