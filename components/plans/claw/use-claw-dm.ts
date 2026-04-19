"use client";

import { useState, useCallback, useMemo } from "react";
import { useClawConnections, useClawSessions } from "@/lib/swr/hooks";

interface ClawDMResponse {
  content: string;
  responseType?: string;
  sessionId?: string;
}

interface UseClawDMReturn {
  send: (message: string) => Promise<void>;
  response: string | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
  connected: boolean;
  connectionId: string | null;
}

export function useClawDM(): UseClawDMReturn {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<{
    id: string;
    connected: boolean;
  } | null>(null);

  const { data: connectionsData } = useClawConnections();
  const connections: { id: string }[] = useMemo(
    () => (Array.isArray(connectionsData) ? connectionsData : []),
    [connectionsData],
  );

  const connectionId = activeConnection?.id ?? connections[0]?.id ?? null;
  const connected = activeConnection?.connected ?? false;

  const { data: sessionsData } = useClawSessions(
    connected ? connectionId : null,
    connected,
  );

  const agentId = useMemo(() => {
    const sessions: { agentId?: string }[] = sessionsData?.sessions ?? [];
    for (const s of sessions) {
      if (s.agentId) return s.agentId;
    }
    return null;
  }, [sessionsData]);

  const checkConnection = useCallback(async () => {
    for (const conn of connections) {
      try {
        const res = await fetch("/api/claw/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: conn.id, action: "status" }),
        });
        const data = await res.json();
        if (data.connected) {
          setActiveConnection({ id: conn.id, connected: true });
          return { id: conn.id, connected: true };
        }
      } catch {
        // skip
      }
    }
    return null;
  }, [connections]);

  const send = useCallback(
    async (message: string) => {
      setLoading(true);
      setError(null);
      setResponse(null);

      let connId = connectionId;
      let agent = agentId;

      if (!connected || !connId) {
        const result = await checkConnection();
        if (!result) {
          setError("Not connected to Claw");
          setLoading(false);
          return;
        }
        connId = result.id;
      }

      if (!agent) {
        try {
          const sessRes = await fetch(
            `/api/claw/sessions?connectionId=${encodeURIComponent(connId)}`,
          );
          const sessData = await sessRes.json();
          const sessions: { agentId?: string }[] = sessData?.sessions ?? [];
          for (const s of sessions) {
            if (s.agentId) {
              agent = s.agentId;
              break;
            }
          }
        } catch {
          // fall through
        }
      }

      if (!agent) {
        setError("No agent available");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/claw/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: connId,
            message,
            agentId: agent,
            sessionId: null,
          }),
        });

        const data: ClawDMResponse = await res.json();

        if (!res.ok) {
          setError(
            (data as unknown as { error?: string }).error ??
              "Request failed",
          );
          setLoading(false);
          return;
        }

        setResponse(data.content ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, agentId, connected, checkConnection],
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    send,
    response,
    loading,
    error,
    reset,
    connected,
    connectionId,
  };
}
