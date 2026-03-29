"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { SessionTarget } from "./types";

interface SessionEntry {
  agentId?: string;
  key?: string;
  model?: string;
  lastActive?: string;
  messageCount?: number;
}

interface SessionSelectorProps {
  connectionId: string | null;
  connected: boolean;
  onSessionChange: (target: SessionTarget) => void;
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

export function SessionSelector({
  connectionId,
  connected,
  onSessionChange,
}: SessionSelectorProps) {
  const t = useT();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");

  const fetchSessions = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`,
      );
      const data = await res.json();
      const list: SessionEntry[] = data.sessions ?? [];
      setSessions(list);

      if (list.length > 0 && !selectedValue) {
        const sorted = [...list].sort((a, b) => {
          const da = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const db = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          return db - da;
        });
        const first = sorted[0];
        if (first.key && first.agentId) {
          setSelectedValue(first.key);
          onSessionChange({
            agentId: first.agentId,
            sessionId: first.key,
            label: `${t("claw.dm.session.conversationFrom")} ${formatDate(first.lastActive)}`,
            model: first.model,
          });
        }
      }
    } catch {
      // network error, keep current state
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected, selectedValue, onSessionChange, t]);

  useEffect(() => {
    if (connected) fetchSessions();
  }, [connected, fetchSessions]);

  const agentIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.agentId) set.add(s.agentId);
    }
    return Array.from(set);
  }, [sessions]);

  const handleChange = useCallback(
    (value: string) => {
      setSelectedValue(value);

      if (value === "__new__") {
        const agentId = agentIds[0];
        if (agentId) {
          onSessionChange({
            agentId,
            sessionId: null,
            label: t("claw.dm.session.newConversation"),
          });
        }
        return;
      }

      const session = sessions.find((s) => s.key === value);
      if (session?.agentId && session.key) {
        onSessionChange({
          agentId: session.agentId,
          sessionId: session.key,
          label: `${t("claw.dm.session.conversationFrom")} ${formatDate(session.lastActive)}`,
          model: session.model,
        });
      }
    },
    [sessions, agentIds, onSessionChange, t],
  );

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedValue} onValueChange={handleChange}>
        <SelectTrigger className="flex-1 h-9">
          <SelectValue placeholder={t("claw.dm.session.selectSession")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__new__">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("claw.dm.session.newConversation")}
            </span>
          </SelectItem>

          {agentIds.map((agentId) => {
            const agentSessions = sessions.filter(
              (s) => s.agentId === agentId && s.key,
            );
            if (agentSessions.length === 0) return null;

            return agentSessions.map((s) => (
              <SelectItem key={s.key} value={s.key!}>
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[200px]">
                    {t("claw.dm.session.conversationFrom")}{" "}
                    {formatDate(s.lastActive)}
                  </span>
                  {s.model && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {s.model}
                    </Badge>
                  )}
                  {s.messageCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({s.messageCount} msgs)
                    </span>
                  )}
                </span>
              </SelectItem>
            ));
          })}

          {sessions.length === 0 && !loading && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {t("claw.dm.session.noSessions")}
            </div>
          )}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        variant="outline"
        onClick={fetchSessions}
        disabled={loading}
        className="h-9 w-9 p-0"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
