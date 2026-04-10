"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  RefreshCw,
  Loader2,
  MessageCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useClawSessions } from "@/lib/swr/hooks";
import type { SessionTarget } from "./types";

interface SessionEntry {
  agentId?: string;
  key?: string;
  sessionId?: string;
  model?: string;
  lastActive?: string;
  messageCount?: number;
}

interface SessionListPanelProps {
  connectionId: string | null;
  connected: boolean;
  activeSessionId: string | null;
  onSessionChange: (target: SessionTarget) => void;
}

const SESSION_NAMES_KEY = "claw-dm-session-names";

function loadSessionNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SESSION_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessionNames(names: Record<string, string>) {
  localStorage.setItem(SESSION_NAMES_KEY, JSON.stringify(names));
}

export function saveSessionName(sessionId: string, name: string) {
  const names = loadSessionNames();
  names[sessionId] = name;
  saveSessionNames(names);
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SessionListPanel({
  connectionId,
  connected,
  activeSessionId,
  onSessionChange,
}: SessionListPanelProps) {
  const t = useT();
  const { data, isLoading: loading, isValidating, mutate } = useClawSessions(connectionId, connected);
  const sessions: SessionEntry[] = data?.sessions ?? [];
  const [sessionNames, setSessionNames] = useState<Record<string, string>>(loadSessionNames);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setSessionNames(loadSessionNames());
  }, [activeSessionId, data]);

  const sortedSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => s.key && s.agentId)
      .sort((a, b) => {
        const da = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const db = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return db - da;
      });
  }, [sessions]);

  const agentIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.agentId) set.add(s.agentId);
    }
    return Array.from(set);
  }, [sessions]);

  const handleNewConversation = useCallback(() => {
    const agentId = agentIds[0];
    if (agentId) {
      onSessionChange({
        agentId,
        sessionId: null,
        label: t("claw.dm.session.newConversation"),
      });
    }
  }, [agentIds, onSessionChange, t]);

  const getDisplayName = useCallback(
    (session: SessionEntry): string => {
      if (!session.key) return t("claw.dm.sessionPanel.untitled");
      if (sessionNames[session.key]) return sessionNames[session.key];
      return formatDate(session.lastActive) || t("claw.dm.sessionPanel.untitled");
    },
    [sessionNames, t],
  );

  const handleSelectSession = useCallback(
    (session: SessionEntry) => {
      if (session.agentId && session.key) {
        onSessionChange({
          agentId: session.agentId,
          sessionId: session.key,
          label: getDisplayName(session),
          model: session.model,
          transcriptId: session.sessionId,
        });
      }
    },
    [onSessionChange, getDisplayName],
  );

  const startRename = (key: string) => {
    setEditingId(key);
    setEditValue(sessionNames[key] || "");
  };

  const confirmRename = () => {
    if (editingId) {
      const updated = { ...sessionNames };
      if (editValue.trim()) {
        updated[editingId] = editValue.trim();
      } else {
        delete updated[editingId];
      }
      setSessionNames(updated);
      saveSessionNames(updated);
      setEditingId(null);
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium truncate">
          {t("claw.dm.session.selectSession")}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => mutate()}
          disabled={loading}
          className="h-7 w-7 p-0 shrink-0"
        >
          {loading || isValidating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="p-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleNewConversation}
          disabled={agentIds.length === 0}
          className="w-full h-8 text-xs justify-start gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("claw.dm.sessionPanel.newChat")}
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="p-2 space-y-0.5">
          {sortedSessions.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {t("claw.dm.sessionPanel.noSessions")}
            </p>
          )}
          {sortedSessions.map((session) => {
            const key = session.key!;
            const isActive = key === activeSessionId;
            const displayName = getDisplayName(session);

            return (
              <div
                key={key}
                className={`group relative rounded-md px-2.5 py-2 cursor-pointer transition-colors overflow-hidden ${
                  isActive
                    ? "bg-muted border border-border"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => handleSelectSession(session)}
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
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      placeholder={t("claw.dm.sessionPanel.renamePlaceholder")}
                      className="h-6 text-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={confirmRename}
                      className="h-6 w-6 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelRename}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium truncate flex-1 min-w-0">
                        {displayName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(key);
                        }}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-5.5">
                      <span className="text-[10px] text-muted-foreground truncate">
                        {formatDate(session.lastActive)}
                      </span>
                      {session.messageCount !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          ({session.messageCount} msgs)
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
