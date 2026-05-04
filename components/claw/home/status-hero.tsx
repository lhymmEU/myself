"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Settings, ArrowRight, Plus, RefreshCw } from "lucide-react";
import { useSWRConfig } from "swr";
import { useT } from "@/lib/i18n/context";
import { useAgentStatus } from "@/lib/swr/hooks";
import { requestReconnect } from "@/lib/modules/claw/client-reconnect";
import { Button } from "@/components/ui/button";
import { StatusPart } from "./parts/status-part";
import { QuickPrompt } from "./quick-prompt";
import type { StatusData } from "@/lib/claw-ai/parts";
import type { ConversationStatus } from "./use-claw-conversation";

interface StatusHeroProps {
  connectionId: string | null;
  connected: boolean;
  status: ConversationStatus;
  onSend: (text: string) => void;
  onNewChat: () => void;
  greeting?: string;
}

/**
 * The single anchored hero at the top of the chat home: identity
 * pill (avatar + state), big prompt input, dynamic suggestions, and a
 * Setup link button to manage connections.
 *
 * When no connection is configured this collapses into a "Connect
 * your Claw" CTA pointing at the setup wizard.
 */
export function StatusHero({
  connectionId,
  connected,
  status,
  onSend,
  onNewChat,
  greeting,
}: StatusHeroProps) {
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: agentStatus } = useAgentStatus(connectionId, connected);

  const statusData: StatusData = useMemo(() => {
    if (!connected) return { state: "offline" };
    if (!agentStatus) return { state: "online" };
    if (!agentStatus.online) return { state: "offline" };
    if (agentStatus.currentTask) {
      return { state: "working", task: agentStatus.currentTask };
    }
    return { state: "online" };
  }, [agentStatus, connected]);

  // The page-level `connected` flag only reflects the SSH tunnel state
  // captured at mount. While we live here `useAgentStatus` polls the
  // remote every 30s and is the canonical "is openclaw responsive
  // right now" signal — it covers both a dropped tunnel (returns
  // `online: false`, `reconnectRequired: true`) and a stopped daemon
  // (returns `online: false`, `health: unknown`). We use it as the
  // truth source for whether the prompt should accept input.
  const reachable =
    connected && (!agentStatus || agentStatus.online !== false);

  const [reconnecting, setReconnecting] = useState(false);
  const handleReconnect = useCallback(async () => {
    if (!connectionId || reconnecting) return;
    setReconnecting(true);
    try {
      const pending = requestReconnect(connectionId);
      if (pending) await pending.catch(() => false);
      // requestReconnect already invalidates the claw SWR keys on
      // success, but we revalidate the agent status explicitly to
      // refresh the pill and re-enable the input even when the
      // reconnect was a no-op (e.g. cooldown).
      await globalMutate(
        `/api/claw/dm/status?connectionId=${encodeURIComponent(connectionId)}`,
      );
    } finally {
      setReconnecting(false);
    }
  }, [connectionId, reconnecting, globalMutate]);

  if (!connectionId) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-muted/30 to-background p-6 text-center space-y-3">
        <h2 className="text-xl font-semibold">
          {t("claw.home.cta.title")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t("claw.home.cta.description")}
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard/claw/setup">
            {t("claw.home.cta.button")}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-muted/30 to-background p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusPart data={statusData} variant="pill" />
          {!reachable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReconnect}
              disabled={reconnecting}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${reconnecting ? "animate-spin" : ""}`}
              />
              {reconnecting
                ? t("claw.home.reconnecting")
                : t("claw.home.reconnect")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onNewChat}
            className="h-8 px-2 text-xs"
            title={t("claw.home.menu.newChat")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("claw.home.menu.newChat")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-8 px-2 text-xs"
            title={t("claw.home.menu.setup")}
          >
            <Link href="/dashboard/claw/setup">
              <Settings className="h-3.5 w-3.5 mr-1" />
              {t("claw.home.menu.setup")}
            </Link>
          </Button>
        </div>
      </div>

      <QuickPrompt
        onSend={onSend}
        disabled={!reachable}
        status={status}
        greeting={
          reachable ? greeting : t("claw.home.offlineNotice")
        }
      />
    </div>
  );
}
