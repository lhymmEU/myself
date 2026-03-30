"use client";

import { useReducer, useCallback } from "react";
import { nanoid } from "nanoid";
import { Server } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type {
  DMState,
  DMAction,
  SessionTarget,
  Message,
  ResponseType,
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
      };
    case "CLEAR_THREAD":
      return { ...state, messages: [], error: null };
    default:
      return state;
  }
}

interface ClawDMPanelProps {
  connectionId: string | null;
  connected: boolean;
}

export function ClawDMPanel({ connectionId, connected }: ClawDMPanelProps) {
  const t = useT();
  const [state, dispatch] = useReducer(dmReducer, initialState);

  const handleSessionChange = useCallback((target: SessionTarget) => {
    dispatch({ type: "SET_SESSION", target });
  }, []);

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

        const agentMessage: Message = {
          id: nanoid(),
          role: "agent",
          content: data.content,
          timestamp: Date.now(),
          responseType: data.responseType as ResponseType,
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
      <div className="w-[260px] shrink-0">
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
          <MessageThread
            messages={state.messages}
            conversationState={state.conversationState}
            error={state.error}
            onDismissError={() => dispatch({ type: "CLEAR_ERROR" })}
          />
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
