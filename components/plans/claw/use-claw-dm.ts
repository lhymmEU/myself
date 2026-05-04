"use client";

import { useState, useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";
import { useClawConnections } from "@/lib/swr/hooks";
import { requestReconnect } from "@/lib/modules/claw/client-reconnect";
import type { ClawUIMessageChunk } from "@/lib/claw-ai/parts";

interface UseClawDMReturn {
  send: (message: string) => Promise<void>;
  response: string | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
  connected: boolean;
  connectionId: string | null;
}

/**
 * One-shot DM helper used by feature surfaces (Plans "generate from
 * todos", etc.) that don't need the full chat experience. Wraps the
 * server-side AI SDK stream and reduces it to a single `text` blob.
 *
 * Connection liveness and agent resolution are entirely server-side —
 * this hook just shepherds the message and surfaces the joined text.
 * When the server signals a stale tunnel (`reconnectRequired`) or
 * remote re-init (`agentsChanged`), we auto-reconnect once and surface
 * the original error so the user can retry without cleanup.
 */
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

  const { mutate: globalMutate } = useSWRConfig();

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

      if (!connected || !connId) {
        const result = await checkConnection();
        if (!result) {
          setError("Not connected to Claw");
          setLoading(false);
          return;
        }
        connId = result.id;
      }

      try {
        const res = await fetch("/api/claw/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: connId,
            // The server reads the latest user message text out of the
            // UIMessage list, so we mimic the AI SDK shape with a single
            // user message. agentId/sessionId omitted — the server
            // resolves them on demand.
            messages: [
              {
                id: `oneshot-${Date.now()}`,
                role: "user",
                parts: [{ type: "text", text: message }],
              },
            ],
            sessionId: null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.reconnectRequired && connId) {
            const pending = requestReconnect(connId);
            if (pending) await pending.catch(() => false);
            globalMutate(
              `/api/claw/sessions?connectionId=${encodeURIComponent(connId)}`,
            );
          }
          setError(
            (data as { error?: string }).error ?? "Request failed",
          );
          setLoading(false);
          return;
        }

        if (!res.body) {
          setError("Empty response");
          setLoading(false);
          return;
        }

        // Drain the SSE stream — we only need the joined assistant
        // text. The dm route emits `text-delta` chunks for streaming
        // text plus `data-error` chunks for failures. Anything else
        // (typed cards) is irrelevant to the plans flow's one-shot
        // text expectation.
        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let buffered = "";
        let combined = "";
        let dataError: string | null = null;
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffered += value;
          let newlineIdx;
          while ((newlineIdx = buffered.indexOf("\n\n")) >= 0) {
            const event = buffered.slice(0, newlineIdx);
            buffered = buffered.slice(newlineIdx + 2);
            const dataLine = event
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (payload === "[DONE]") {
              done = true;
              break;
            }
            try {
              const chunk = JSON.parse(payload) as ClawUIMessageChunk;
              if (chunk.type === "text-delta") {
                combined += (chunk as { delta?: string }).delta ?? "";
              }
              if (chunk.type === "data-error") {
                const data = (chunk as { data?: { message?: string } }).data;
                if (data?.message) dataError = data.message;
              }
            } catch {
              // malformed event — skip
            }
          }
        }

        if (dataError && !combined) {
          setError(dataError);
        } else {
          setResponse(combined);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, connected, checkConnection, globalMutate],
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
