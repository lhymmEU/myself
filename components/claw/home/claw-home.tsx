"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { useClawSessions, useClawSessionMeta } from "@/lib/swr/hooks";
import { migrateLegacySessionNames } from "./session-name-migration";
import { useClawConversation } from "./use-claw-conversation";
import type {
  SessionTarget,
  UseClawConversationReturn,
} from "./use-claw-conversation";
import { StatusHero } from "./status-hero";
import { InlineConversation } from "./inline-conversation";
import { RecentConversationsCard } from "./cards/recent-conversations-card";
import { OnboardingOverlay } from "./onboarding-overlay";

interface ClawHomeProps {
  connectionId: string | null;
  connected: boolean;
  initialPrompt?: string;
  initialSessionName?: string;
}

/**
 * Companion home — the top-level chat-mode view.
 *
 * Layout:
 *   - Status hero: state pill, big input, New chat + Setup buttons
 *   - Inline conversation: opens beneath the hero on send and renders
 *     `message.parts` via the shared `MessagePartRenderer`. Closing it
 *     keeps the recent conversations card visible.
 *   - Recent conversations card: switch between past sessions.
 *
 * The home is intentionally read-only by default — every action a
 * user takes (send a message, approve a tool, fill a generative form)
 * flows through the same useChat-driven hook so the UI is always
 * reactive to remote streams.
 */
export function ClawHome({
  connectionId,
  connected,
  initialPrompt,
  initialSessionName,
}: ClawHomeProps) {
  const t = useT();

  // Persist session names server-side via the meta API. Reads the
  // live conversation through a ref so the callback can resolve the
  // current target's agentId without re-binding on every render. The
  // ref is populated by a useEffect right after `conversation` is
  // initialized (see below).
  const conversationRef = useRef<UseClawConversationReturn | null>(null);

  const persistSessionName = useCallback(
    async (sessionId: string, name: string) => {
      if (!connectionId) return;
      const agentId = conversationRef.current?.sessionTarget?.agentId;
      if (!agentId) return;
      try {
        await fetch(
          `/api/claw/sessions/meta/${encodeURIComponent(sessionId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId, agentId, name }),
          },
        );
      } catch {
        // best-effort
      }
    },
    [connectionId],
  );

  const conversation = useClawConversation({
    connectionId,
    connected,
    initialPrompt,
    initialSessionName,
    onSessionNamed: persistSessionName,
  });

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const [showConversation, setShowConversation] = useState(
    Boolean(initialPrompt),
  );

  useEffect(() => {
    if (conversation.messages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror "did the conversation come alive?" into local UI state. Cheap and idempotent; no cascading-render risk because the next render reads `conversation.messages` straight off the same hook.
      setShowConversation(true);
    }
  }, [conversation.messages.length]);

  // One-shot legacy localStorage → server migration once we have a
  // live session list to enrich the records with agentIds.
  const { data: sessionsData } = useClawSessions(connectionId, connected);
  useClawSessionMeta(connectionId);
  useEffect(() => {
    if (!connectionId) return;
    const live = sessionsData?.sessions ?? [];
    if (live.length === 0) return;
    void migrateLegacySessionNames(connectionId, live);
  }, [connectionId, sessionsData]);

  const handleSend = useCallback(
    async (text: string) => {
      setShowConversation(true);
      await conversation.send(text);
    },
    [conversation],
  );

  const handleNewChat = useCallback(() => {
    conversation.clearSession();
    setShowConversation(false);
  }, [conversation]);

  const handleSelectSession = useCallback(
    (target: SessionTarget) => {
      conversation.setSession(target);
      setShowConversation(true);
    },
    [conversation],
  );

  return (
    <div className="space-y-4">
      {!connectionId && (
        <OnboardingOverlay forceOpen={!connectionId} showSetupCta />
      )}

      <StatusHero
        connectionId={connectionId}
        connected={connected}
        status={conversation.status}
        onSend={handleSend}
        onNewChat={handleNewChat}
        greeting={
          connected
            ? t("claw.home.greeting" as Parameters<typeof t>[0])
            : undefined
        }
      />

      {showConversation && connectionId && (
        <InlineConversation
          messages={conversation.messages}
          status={conversation.status}
          error={conversation.error}
          onApproveTool={(messageId, partId) =>
            void conversation.approveTool(messageId, partId)
          }
          onRejectTool={conversation.rejectTool}
          onClose={() => setShowConversation(false)}
          onNewChat={handleNewChat}
          onDismissError={conversation.dismissError}
        />
      )}

      {connectionId && connected && (
        <RecentConversationsCard
          connectionId={connectionId}
          connected={connected}
          activeSessionId={conversation.sessionTarget?.sessionId ?? null}
          onSelect={handleSelectSession}
        />
      )}
    </div>
  );
}
