"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { Server, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type {
  DMState,
  DMAction,
  SessionTarget,
  Message,
  ResponseType,
  PendingToolCall,
} from "./types";
import { SessionListPanel } from "./session-list-panel";
import { AgentStatusBar } from "./agent-status-bar";
import { MessageThread } from "./message-thread";
import { ActionShelf } from "./action-shelf";
import { SmartInput } from "./smart-input";
import { CronPanel } from "./cron-panel";

const initialState: DMState = {
  conversationState: "idle",
  messages: [],
  sessionTarget: null,
  error: null,
  loadingHistory: false,
};

function dmReducer(state: DMState, action: DMAction): DMState {
  switch (action.type) {
    case "SET_SENDING":
      return { ...state, conversationState: "sending", error: null };
    case "SEND_MESSAGE":
      return {
        ...state,
        conversationState: "agent-typing",
        messages: [...state.messages, action.message],
      };
    case "RECEIVE_MESSAGE": {
      const newTarget =
        action.sessionId && state.sessionTarget
          ? { ...state.sessionTarget, sessionId: action.sessionId }
          : state.sessionTarget;
      return {
        ...state,
        conversationState: "idle",
        messages: [...state.messages, action.message],
        sessionTarget: newTarget,
      };
    }
    case "SET_ERROR":
      return { ...state, conversationState: "error", error: action.error };
    case "CLEAR_ERROR":
      return { ...state, conversationState: "idle", error: null };
    case "SET_SESSION":
      return {
        ...state,
        sessionTarget: action.target,
        messages: [],
        conversationState: "idle",
        error: null,
        loadingHistory: false,
      };
    case "CLEAR_THREAD":
      return { ...state, messages: [], error: null };
    case "LOAD_HISTORY":
      return {
        ...state,
        messages: action.messages,
        loadingHistory: false,
      };
    case "SET_LOADING_HISTORY":
      return { ...state, loadingHistory: action.loading };
    case "UPDATE_TOOL_CALL": {
      const messages = state.messages.map((msg) => {
        if (msg.id !== action.messageId || !msg.toolCalls) return msg;
        const updated = [...msg.toolCalls];
        updated[action.toolIndex] = { ...updated[action.toolIndex], ...action.update };
        return { ...msg, toolCalls: updated };
      });
      return { ...state, messages };
    }
    default:
      return state;
  }
}

interface ClawDMPanelProps {
  connectionId: string | null;
  connected: boolean;
  initialPrompt?: string;
}

export function ClawDMPanel({ connectionId, connected, initialPrompt }: ClawDMPanelProps) {
  const t = useT();
  const [state, dispatch] = useReducer(dmReducer, initialState);

  const fetchSessionHistory = useCallback(
    async (sessionKey: string, agentId: string) => {
      if (!connectionId) return;
      dispatch({ type: "SET_LOADING_HISTORY", loading: true });
      try {
        const qs = new URLSearchParams({
          connectionId,
          agentId,
        });
        const res = await fetch(
          `/api/claw/sessions/${encodeURIComponent(sessionKey)}/history?${qs}`
        );
        const data = await res.json();
        const messages: Message[] = (data.messages ?? []).map(
          (msg: { role: string; content: string; timestamp: number }) => ({
            id: nanoid(),
            role: msg.role as "user" | "agent",
            content: msg.content,
            timestamp: msg.timestamp,
          })
        );
        dispatch({ type: "LOAD_HISTORY", messages });
      } catch {
        dispatch({ type: "SET_LOADING_HISTORY", loading: false });
      }
    },
    [connectionId]
  );

  const handleSessionChange = useCallback(
    (target: SessionTarget) => {
      dispatch({ type: "SET_SESSION", target });
      if (target.sessionId) {
        fetchSessionHistory(target.sessionId, target.agentId);
      }
    },
    [fetchSessionHistory]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!connectionId || !state.sessionTarget) return;

      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      dispatch({ type: "SEND_MESSAGE", message: userMessage });

      try {
        const res = await fetch("/api/claw/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            message: text,
            agentId: state.sessionTarget.agentId,
            sessionId: state.sessionTarget.sessionId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          dispatch({
            type: "SET_ERROR",
            error: data.error ?? "Something went wrong",
          });
          return;
        }

        let toolCalls: PendingToolCall[] | undefined;
        if (data.responseType === "tool_request" && Array.isArray(data.toolCalls)) {
          toolCalls = data.toolCalls.map(
            (tc: { name: string; arguments: Record<string, unknown> }) => ({
              name: tc.name,
              arguments: tc.arguments,
              status: "pending" as const,
            }),
          );
        }

        const agentMessage: Message = {
          id: nanoid(),
          role: "agent",
          content: data.content ?? "",
          timestamp: Date.now(),
          responseType: data.responseType as ResponseType,
          toolCalls,
        };

        dispatch({
          type: "RECEIVE_MESSAGE",
          message: agentMessage,
          sessionId: data.sessionId ?? undefined,
        });
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          error: err instanceof Error ? err.message : "Network error",
        });
      }
    },
    [connectionId, state.sessionTarget],
  );

  const handlePillInsert = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend],
  );

  const handleApproveToolCall = useCallback(
    async (messageId: string, toolIndex: number) => {
      const msg = state.messages.find((m) => m.id === messageId);
      const tc = msg?.toolCalls?.[toolIndex];
      if (!tc) return;

      dispatch({
        type: "UPDATE_TOOL_CALL",
        messageId,
        toolIndex,
        update: { status: "executing" },
      });

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tc.name, arguments: tc.arguments }),
        });
        const result = await res.json();

        if (result.success) {
          dispatch({
            type: "UPDATE_TOOL_CALL",
            messageId,
            toolIndex,
            update: { status: "succeeded", result: result.data },
          });

          if (connectionId && state.sessionTarget) {
            const summary = `[Tool "${tc.name}" executed successfully. Result: ${JSON.stringify(result.data)}]`;
            handleSend(summary);
          }
        } else {
          dispatch({
            type: "UPDATE_TOOL_CALL",
            messageId,
            toolIndex,
            update: { status: "failed", error: result.error ?? "Unknown error" },
          });
        }
      } catch (err) {
        dispatch({
          type: "UPDATE_TOOL_CALL",
          messageId,
          toolIndex,
          update: {
            status: "failed",
            error: err instanceof Error ? err.message : "Network error",
          },
        });
      }
    },
    [state.messages, connectionId, state.sessionTarget, handleSend],
  );

  const handleRejectToolCall = useCallback(
    (messageId: string, toolIndex: number) => {
      dispatch({
        type: "UPDATE_TOOL_CALL",
        messageId,
        toolIndex,
        update: { status: "rejected" },
      });
    },
    [],
  );

  const initialPromptSent = useRef(false);
  useEffect(() => {
    if (
      initialPrompt &&
      !initialPromptSent.current &&
      connected &&
      state.sessionTarget &&
      state.conversationState === "idle"
    ) {
      initialPromptSent.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt, connected, state.sessionTarget, state.conversationState, handleSend]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t("claw.dm.notConnected")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-lg border overflow-hidden">
      {/* Left: Session List */}
      <div className="w-[260px] shrink-0 overflow-hidden">
        <SessionListPanel
          connectionId={connectionId}
          connected={connected}
          activeSessionId={state.sessionTarget?.sessionId ?? null}
          onSessionChange={handleSessionChange}
        />
      </div>

      {/* Center: Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 border-x">
        <div className="p-3 border-b">
          <AgentStatusBar
            connectionId={connectionId}
            connected={connected}
            sessionTarget={state.sessionTarget}
          />
        </div>

        <div className="flex-1 min-h-0">
          {state.loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MessageThread
              messages={state.messages}
              conversationState={state.conversationState}
              error={state.error}
              onDismissError={() => dispatch({ type: "CLEAR_ERROR" })}
              onApproveToolCall={handleApproveToolCall}
              onRejectToolCall={handleRejectToolCall}
            />
          )}
        </div>

        <div className="p-3 border-t space-y-2">
          <ActionShelf
            conversationState={state.conversationState}
            onInsert={handlePillInsert}
            disabled={!state.sessionTarget}
          />
          <SmartInput
            onSend={handleSend}
            disabled={
              !state.sessionTarget ||
              state.conversationState === "sending" ||
              state.conversationState === "agent-typing"
            }
            conversationState={state.conversationState}
          />
        </div>
      </div>

      {/* Right: Cron Panel */}
      <div className="w-[400px] shrink-0 min-w-0 max-w-full overflow-hidden">
        <CronPanel connectionId={connectionId} />
      </div>
    </div>
  );
}
