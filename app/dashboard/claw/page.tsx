"use client";

import { useState, useCallback } from "react";
import { MessageCircle, Settings2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { ConnectionForm } from "@/components/claw/connection-form";
import { ClawAdvancedView } from "@/components/claw/claw-advanced-view";
import { ClawDMPanel } from "@/components/claw/dm/claw-dm-panel";

interface ConnectState {
  connected: boolean;
  connectionId: string | null;
  host?: string;
  username?: string;
}

type ClawMode = "dm" | "advanced";

export default function ClawPage() {
  const t = useT();
  const [connectState, setConnectState] = useState<ConnectState>({
    connected: false,
    connectionId: null,
  });
  const [mode, setMode] = useState<ClawMode>("dm");

  const handleConnectionChange = useCallback((state: ConnectState) => {
    setConnectState(state);
  }, []);

  return (
    <div className="space-y-6 px-8 py-4">
      <ConnectionForm onConnectionChange={handleConnectionChange} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("dm")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "dm"
              ? "bg-muted border-border text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {t("claw.dm.modeChat")}
        </button>
        <button
          type="button"
          onClick={() => setMode("advanced")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "advanced"
              ? "bg-muted border-border text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {t("claw.dm.modeAdvanced")}
        </button>
      </div>

      {mode === "dm" ? (
        <ClawDMPanel
          connectionId={connectState.connectionId}
          connected={connectState.connected}
        />
      ) : (
        <ClawAdvancedView
          connectionId={connectState.connectionId}
          connected={connectState.connected}
        />
      )}
    </div>
  );
}
