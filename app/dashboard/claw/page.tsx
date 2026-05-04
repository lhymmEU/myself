"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useClawConnections } from "@/lib/swr/hooks";
import { ClawHome } from "@/components/claw/home/claw-home";

interface ConnectState {
  connected: boolean;
  connectionId: string | null;
  host?: string;
  username?: string;
}

interface ConnectionInfo {
  id: string;
  isDefault: boolean;
}

function ClawPageInner() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("askClaw") ?? undefined;
  const initialSessionName = searchParams.get("sessionName") ?? undefined;

  const [connectState, setConnectState] = useState<ConnectState>({
    connected: false,
    connectionId: null,
  });

  // The chat home no longer renders the connection form. We resolve
  // the default connection here and probe its live status so the home
  // hero gets the right `connected` flag without UI clutter.
  const { data: connectionsData } = useClawConnections();
  const connections: ConnectionInfo[] = Array.isArray(connectionsData)
    ? connectionsData
    : [];
  const defaultConnection = connections.find((c) => c.isDefault) ?? connections[0];

  const probeStatus = useCallback(async (connectionId: string) => {
    try {
      const res = await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action: "status" }),
      });
      const data = await res.json();
      if (data.connected) {
        setConnectState({
          connected: true,
          connectionId,
          host: data.host,
          username: data.username,
        });
        return true;
      }
    } catch {
      // ignore — we'll show the "Connect your Claw" CTA
    }
    return false;
  }, []);

  useEffect(() => {
    if (!defaultConnection?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing connection state with the live `connections` list; no synchronous derived form because we also probe a remote endpoint below.
      setConnectState({ connected: false, connectionId: null });
      return;
    }
    const id = defaultConnection.id;
    // Optimistically set the id so the home renders cards even while
    // we're still probing whether the tunnel is alive.
    setConnectState((prev) => ({ ...prev, connectionId: id }));
    void probeStatus(id).then((ok) => {
      if (!ok) {
        // Try connect — many users land here without a live tunnel.
        fetch("/api/claw/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: id }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.connected) {
              setConnectState({
                connected: true,
                connectionId: id,
                host: data.host,
                username: data.username,
              });
            }
          })
          .catch(() => null);
      }
    });
  }, [defaultConnection?.id, probeStatus]);

  return (
    <div className="space-y-6 px-8 py-4">
      <ClawHome
        connectionId={connectState.connectionId}
        connected={connectState.connected}
        initialPrompt={initialPrompt}
        initialSessionName={initialSessionName}
      />
    </div>
  );
}

export default function ClawPage() {
  return (
    <Suspense fallback={<div className="px-8 py-4" />}>
      <ClawPageInner />
    </Suspense>
  );
}
