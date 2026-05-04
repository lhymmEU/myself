"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSWRConfig } from "swr";
import { useT } from "@/lib/i18n/context";
import { useClawSessions } from "@/lib/swr/hooks";
import { requestReconnect } from "@/lib/modules/claw/client-reconnect";
import type {
  ClawUIMessage,
  ApprovalData,
  ApprovalStatus,
} from "@/lib/claw-ai/parts";

export interface SessionTarget {
  agentId: string;
  sessionId: string | null;
  label: string;
  model?: string;
  /** Original transcript file ID — distinct from the openclaw session key. */
  transcriptId?: string;
}

export interface UseClawConversationOptions {
  connectionId: string | null;
  connected: boolean;
  initialPrompt?: string;
  initialSessionName?: string;
  /** Lets the parent refetch agent-dependent UI when the agent set shifts. */
  onAgentsChanged?: () => void;
  /** Called once after the first user message creates a brand-new session. */
  onSessionNamed?: (sessionId: string, name: string) => void;
}

export type ConversationStatus =
  | "idle"
  | "loading-history"
  | "submitted"
  | "streaming"
  | "error";

export interface UseClawConversationReturn {
  messages: ClawUIMessage[];
  status: ConversationStatus;
  error: Error | null;
  agentIds: string[];
  sessionTarget: SessionTarget | null;
  send: (text: string) => Promise<void>;
  setSession: (target: SessionTarget) => void;
  clearSession: () => void;
  clearThread: () => void;
  approveTool: (messageId: string, partId: string) => Promise<void>;
  rejectTool: (messageId: string, partId: string) => void;
  dismissError: () => void;
  /** True while the conversation hook is hydrating remote history. */
  loadingHistory: boolean;
}

interface ServerErrorBody {
  error?: string;
  reconnectRequired?: boolean;
  agentsChanged?: boolean;
}

/**
 * AI SDK-driven conversation hook. Wraps `useChat` with custom logic
 * that:
 *   - injects the active session/agent into every request body via
 *     `prepareSendMessagesRequest` (so a session change reroutes
 *     subsequent messages without recreating the transport),
 *   - intercepts 503 reconnectRequired / agentsChanged signals from
 *     `app/api/claw/dm/route.ts` and triggers the same recovery flow
 *     as the legacy reducer-based hook,
 *   - tracks effective sessionId/agentId returned in message metadata
 *     so we can rebind a stale target without manual probing,
 *   - hydrates session history into `setMessages` for resuming
 *     conversations.
 */
export function useClawConversation(
  opts: UseClawConversationOptions,
): UseClawConversationReturn {
  const {
    connectionId,
    connected,
    initialPrompt,
    initialSessionName,
    onAgentsChanged,
    onSessionNamed,
  } = opts;
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: sessionsData } = useClawSessions(connectionId, connected);

  const [sessionTarget, setSessionTargetState] =
    useState<SessionTarget | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const sessionTargetRef = useRef<SessionTarget | null>(null);
  useEffect(() => {
    sessionTargetRef.current = sessionTarget;
  }, [sessionTarget]);

  const agentIds = useMemo(() => {
    const sessions: { agentId?: string }[] = sessionsData?.sessions ?? [];
    const set = new Set<string>();
    for (const s of sessions) if (s.agentId) set.add(s.agentId);
    return Array.from(set);
  }, [sessionsData]);

  const revalidateSessions = useCallback(() => {
    if (!connectionId) return;
    globalMutate(
      `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`,
    );
  }, [connectionId, globalMutate]);

  const onAgentsChangedRef = useRef(onAgentsChanged);
  const onSessionNamedRef = useRef(onSessionNamed);
  useEffect(() => {
    onAgentsChangedRef.current = onAgentsChanged;
    onSessionNamedRef.current = onSessionNamed;
  }, [onAgentsChanged, onSessionNamed]);

  // --- Transport ---------------------------------------------------------
  // The transport is a stable singleton per (connectionId) — every send
  // re-reads sessionTargetRef so a session change rebinds the next request
  // without forcing a transport recreate (which would remount useChat).
  // The transport is a stable singleton per (connectionId, initialSessionName)
  // — every send re-reads sessionTargetRef so a session change rebinds the
  // next request without forcing a transport recreate. The ref read happens
  // at send-time (not during render), so the lint rule for refs-in-render
  // doesn't apply here.
  /* eslint-disable react-hooks/refs */
  const transport = useMemo(() => {
    return new DefaultChatTransport<ClawUIMessage>({
      api: "/api/claw/dm",
      prepareSendMessagesRequest: ({ messages, body }) => {
        const target = sessionTargetRef.current;
        return {
          body: {
            ...(body ?? {}),
            messages,
            connectionId,
            agentId: target?.agentId ?? null,
            sessionId: target?.sessionId ?? null,
            initialSessionName,
          },
        };
      },
    });
  }, [connectionId, initialSessionName]);
  /* eslint-enable react-hooks/refs */

  const chat = useChat<ClawUIMessage>({
    transport,
    onError: (error) => {
      // Server errors arrive as a plain Error whose message is the JSON
      // response body — see HttpChatTransport.sendMessages in node_modules/ai.
      let parsed: ServerErrorBody | null = null;
      try {
        parsed = JSON.parse(error.message) as ServerErrorBody;
      } catch {
        parsed = null;
      }
      if (parsed?.reconnectRequired && connectionId) {
        const pending = requestReconnect(connectionId);
        if (pending) pending.catch(() => false);
        revalidateSessions();
      }
      if (parsed?.agentsChanged) {
        sessionTargetRef.current = null;
        setSessionTargetState(null);
        revalidateSessions();
        onAgentsChangedRef.current?.();
      }
    },
    onFinish: ({ message }) => {
      const meta = message.metadata as
        | { sessionId?: string; agentId?: string; retriedWithFreshAgent?: boolean }
        | undefined;
      if (!meta) return;

      const current = sessionTargetRef.current;
      if (current) {
        let next = current;
        let changed = false;
        if (meta.agentId && meta.agentId !== current.agentId) {
          next = { ...next, agentId: meta.agentId };
          changed = true;
        }
        if (meta.sessionId && meta.sessionId !== current.sessionId) {
          next = { ...next, sessionId: meta.sessionId };
          changed = true;
        }
        if (changed) {
          sessionTargetRef.current = next;
          setSessionTargetState(next);
        }
      } else if (meta.agentId) {
        // The first send happened without a preset target (because the
        // sessions list hadn't populated `agentIds` yet — typically
        // because openclaw was momentarily unreachable). The server
        // resolved an agent for us; lock it in now so subsequent
        // messages reuse it instead of round-tripping resolve again.
        const resolved: SessionTarget = {
          agentId: meta.agentId,
          sessionId: meta.sessionId ?? null,
          label: initialSessionName ?? t("claw.dm.session.newConversation"),
        };
        sessionTargetRef.current = resolved;
        setSessionTargetState(resolved);
      }

      // Auto-name the session on first user message of a fresh thread.
      if (
        !current?.sessionId &&
        meta.sessionId &&
        onSessionNamedRef.current
      ) {
        const firstUser = chat.messages.find((m) => m.role === "user");
        const firstText = firstUser?.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim();
        const name = initialSessionName
          ? initialSessionName
          : firstText && firstText.length > 50
            ? firstText.slice(0, 47) + "..."
            : firstText ?? "";
        if (name) {
          onSessionNamedRef.current(meta.sessionId, name);
          revalidateSessions();
        }
      }

      if (meta.retriedWithFreshAgent) {
        revalidateSessions();
      }
    },
  });

  const status: ConversationStatus = loadingHistory
    ? "loading-history"
    : chat.status === "submitted"
      ? "submitted"
      : chat.status === "streaming"
        ? "streaming"
        : chat.status === "error"
          ? "error"
          : "idle";

  // The AI SDK's HttpChatTransport surfaces non-2xx responses by
  // throwing an Error whose message is the raw response body. For our
  // dm route that body is JSON like `{"error":"Not connected via SSH",
  // "reconnectRequired":true}`. Showing JSON to a non-tech user is a
  // bad experience, so we project chat.error into a clean Error.
  const friendlyError = useMemo<Error | null>(() => {
    if (!chat.error) return null;
    let parsed: ServerErrorBody | null = null;
    try {
      parsed = JSON.parse(chat.error.message) as ServerErrorBody;
    } catch {
      parsed = null;
    }
    if (parsed?.error) {
      return new Error(parsed.error);
    }
    return chat.error;
  }, [chat.error]);

  // --- Session controls --------------------------------------------------
  const clearThread = useCallback(() => {
    chat.setMessages([]);
    chat.clearError();
  }, [chat]);

  const setSession = useCallback(
    (target: SessionTarget) => {
      sessionTargetRef.current = target;
      setSessionTargetState(target);
      chat.setMessages([]);
      chat.clearError();
      if (target.sessionId && connectionId) {
        setLoadingHistory(true);
        const qs = new URLSearchParams({
          connectionId,
          agentId: target.agentId,
        });
        if (target.transcriptId) qs.set("transcriptId", target.transcriptId);
        fetch(
          `/api/claw/sessions/${encodeURIComponent(target.sessionId)}/history?${qs}`,
        )
          .then((r) => (r.ok ? r.json() : { messages: [] }))
          .then((data) => {
            const msgs: ClawUIMessage[] = Array.isArray(data?.messages)
              ? data.messages
              : [];
            chat.setMessages(msgs);
          })
          .catch(() => {
            chat.setMessages([]);
          })
          .finally(() => setLoadingHistory(false));
      } else {
        setLoadingHistory(false);
      }
    },
    [chat, connectionId],
  );

  const clearSession = useCallback(() => {
    sessionTargetRef.current = null;
    setSessionTargetState(null);
    chat.setMessages([]);
    chat.clearError();
    setLoadingHistory(false);
  }, [chat]);

  const send = useCallback(
    async (text: string) => {
      if (!connectionId) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // First-time send before a session is selected: pick the default
      // agent if we already know one (most common case — sessions list
      // populated `agentIds`). Otherwise we send WITHOUT a preset agent
      // and let the server's `resolveAgentId` discover one on the remote.
      // Failing that, the server returns a friendly 503 that surfaces in
      // the conversation as an `ErrorPart`. The previous silent return
      // here meant a click on "Send" looked like a no-op when openclaw
      // wasn't running yet.
      if (!sessionTargetRef.current && agentIds.length > 0) {
        const target: SessionTarget = {
          agentId: agentIds[0],
          sessionId: null,
          label: initialSessionName ?? t("claw.dm.session.newConversation"),
        };
        sessionTargetRef.current = target;
        setSessionTargetState(target);
      }

      await chat.sendMessage({ text: trimmed });
    },
    [chat, connectionId, agentIds, initialSessionName, t],
  );

  // --- Tool approval -----------------------------------------------------
  const updateApprovalPart = useCallback(
    (
      messageId: string,
      partId: string,
      patch: Partial<ApprovalData>,
    ) => {
      chat.setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          return {
            ...msg,
            parts: msg.parts.map((p) => {
              if (p.type !== "data-approval") return p;
              if (p.id !== partId) return p;
              return { ...p, data: { ...p.data, ...patch } };
            }),
          };
        }),
      );
    },
    [chat],
  );

  const approveTool = useCallback(
    async (messageId: string, partId: string) => {
      const message = chat.messages.find((m) => m.id === messageId);
      const part = message?.parts.find(
        (p) => p.type === "data-approval" && p.id === partId,
      );
      if (!part || part.type !== "data-approval") return;

      updateApprovalPart(messageId, partId, {
        status: "executing" as ApprovalStatus,
      });

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: part.data.tool,
            arguments: part.data.args,
          }),
        });
        const result = await res.json();
        if (result?.success) {
          const friendly =
            typeof result.data === "string"
              ? result.data
              : t("claw.parts.approval.succeeded");
          updateApprovalPart(messageId, partId, {
            status: "succeeded",
            result: friendly,
          });
        } else {
          updateApprovalPart(messageId, partId, {
            status: "failed",
            result: result?.error ?? t("claw.parts.approval.failed"),
          });
        }
      } catch (err) {
        updateApprovalPart(messageId, partId, {
          status: "failed",
          result: err instanceof Error ? err.message : "Network error",
        });
      }
    },
    [chat.messages, t, updateApprovalPart],
  );

  const rejectTool = useCallback(
    (messageId: string, partId: string) => {
      updateApprovalPart(messageId, partId, { status: "rejected" });
    },
    [updateApprovalPart],
  );

  const dismissError = useCallback(() => {
    chat.clearError();
  }, [chat]);

  // --- Reactive recovery -------------------------------------------------
  const lastAgentsChanged = useRef(false);
  useEffect(() => {
    const changed = sessionsData?.agentsChanged === true;
    if (changed && !lastAgentsChanged.current && sessionTarget) {
      sessionTargetRef.current = null;
      setSessionTargetState(null);
      onAgentsChangedRef.current?.();
    }
    lastAgentsChanged.current = changed;
  }, [sessionsData, sessionTarget]);

  // If the agentId we're holding no longer exists in the live list, drop it.
  useEffect(() => {
    if (
      sessionTarget &&
      agentIds.length > 0 &&
      !agentIds.includes(sessionTarget.agentId)
    ) {
      sessionTargetRef.current = null;
      setSessionTargetState(null);
    }
  }, [agentIds, sessionTarget]);

  // --- Initial prompt fast-path -----------------------------------------
  const autoSessionCreated = useRef(false);
  useEffect(() => {
    if (
      initialPrompt &&
      !autoSessionCreated.current &&
      connected &&
      !sessionTarget &&
      agentIds.length > 0
    ) {
      autoSessionCreated.current = true;
      const target: SessionTarget = {
        agentId: agentIds[0],
        sessionId: null,
        label: initialSessionName ?? t("claw.dm.session.newConversation"),
      };
      sessionTargetRef.current = target;
      setSessionTargetState(target);
    }
  }, [
    initialPrompt,
    connected,
    sessionTarget,
    agentIds,
    initialSessionName,
    t,
  ]);

  const initialPromptSent = useRef(false);
  useEffect(() => {
    if (
      initialPrompt &&
      !initialPromptSent.current &&
      connected &&
      sessionTarget &&
      status === "idle"
    ) {
      initialPromptSent.current = true;
      void send(initialPrompt);
    }
  }, [initialPrompt, connected, sessionTarget, status, send]);

  return {
    messages: chat.messages,
    status,
    error: friendlyError,
    agentIds,
    sessionTarget,
    send,
    setSession,
    clearSession,
    clearThread,
    approveTool,
    rejectTool,
    dismissError,
    loadingHistory,
  };
}
