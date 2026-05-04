"use client";

import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Pencil, Check, X, MessageCircle, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClawSessions, useClawSessionMeta } from "@/lib/swr/hooks";
import { cn } from "@/lib/utils";
import type { SessionTarget } from "../use-claw-conversation";

interface SessionEntry {
  agentId?: string;
  key?: string;
  sessionId?: string;
  model?: string;
  lastActive?: string;
  messageCount?: number;
}

interface RecentConversationsCardProps {
  connectionId: string | null;
  connected: boolean;
  activeSessionId: string | null;
  onSelect: (target: SessionTarget) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Recent conversations card. Joins openclaw's live session list with
 * the server-persisted name table (so renames travel across devices),
 * and lets the user select / rename a session inline. Selecting a
 * session lifts state into the inline conversation via `onSelect`.
 */
export function RecentConversationsCard({
  connectionId,
  connected,
  activeSessionId,
  onSelect,
}: RecentConversationsCardProps) {
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const { data, isValidating } = useClawSessions(connectionId, connected);
  const { data: metaData } = useClawSessionMeta(connectionId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const sessions: SessionEntry[] = useMemo(
    () => data?.sessions ?? [],
    [data?.sessions],
  );

  const namesByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of metaData?.records ?? []) {
      if (r.name) map.set(r.sessionId, r.name);
    }
    return map;
  }, [metaData]);

  const sortedSessions = useMemo(
    () =>
      [...sessions]
        .filter((s) => s.key && s.agentId)
        .sort((a, b) => {
          const da = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const db = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          return db - da;
        })
        .slice(0, 6),
    [sessions],
  );

  const getDisplayName = useCallback(
    (s: SessionEntry): string => {
      if (!s.key) return t("claw.dm.sessionPanel.untitled");
      const named = namesByKey.get(s.key);
      if (named) return named;
      return formatDate(s.lastActive) || t("claw.dm.sessionPanel.untitled");
    },
    [namesByKey, t],
  );

  const handleSelect = useCallback(
    (s: SessionEntry) => {
      if (!s.agentId || !s.key) return;
      onSelect({
        agentId: s.agentId,
        sessionId: s.key,
        label: getDisplayName(s),
        model: s.model,
        transcriptId: s.sessionId,
      });
    },
    [onSelect, getDisplayName],
  );

  const startRename = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setEditingId(key);
    setEditValue(namesByKey.get(key) ?? "");
  };

  const confirmRename = useCallback(
    async (s: SessionEntry) => {
      if (!s.key || !s.agentId || !connectionId) return;
      const trimmed = editValue.trim();
      try {
        await fetch(
          `/api/claw/sessions/meta/${encodeURIComponent(s.key)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              connectionId,
              agentId: s.agentId,
              name: trimmed || null,
            }),
          },
        );
      } finally {
        setEditingId(null);
        setEditValue("");
        globalMutate(
          `/api/claw/sessions/meta?connectionId=${encodeURIComponent(connectionId)}`,
        );
      }
    },
    [editValue, connectionId, globalMutate],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {t("claw.home.cards.recentTitle")}
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={isValidating}
          onClick={() =>
            globalMutate(
              connectionId
                ? `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`
                : null,
            )
          }
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isValidating && "animate-spin")}
          />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {sortedSessions.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            {t("claw.dm.sessionPanel.noSessions")}
          </p>
        )}
        {sortedSessions.map((s) => {
          const key = s.key!;
          const isActive = key === activeSessionId;
          const displayName = getDisplayName(s);

          return (
            <div
              key={key}
              className={cn(
                "group rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                isActive
                  ? "bg-muted border border-border"
                  : "hover:bg-muted/40 border border-transparent",
              )}
              onClick={() => handleSelect(s)}
            >
              {editingId === key ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename(s);
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditValue("");
                      }
                    }}
                    className="h-6 text-xs"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirmRename(s)}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditValue("");
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {formatDate(s.lastActive)}
                      {s.messageCount !== undefined && ` · ${s.messageCount}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => startRename(e, key)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
