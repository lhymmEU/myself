"use client";

import { useState, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ConnectionForm } from "@/components/claw/connection-form";
import { StatusPanel } from "@/components/claw/status-panel";
import { LogsViewer } from "@/components/claw/logs-viewer";
import { ChannelsPanel } from "@/components/claw/channels-panel";
import { SessionsPanel } from "@/components/claw/sessions-panel";
import { ConfigEditor } from "@/components/claw/config-editor";
import { GatewayControl } from "@/components/claw/gateway-control";
import dynamic from "next/dynamic";

const ClawTerminal = dynamic(
  () => import("@/components/claw/terminal").then((m) => m.ClawTerminal),
  { ssr: false, loading: () => <div className="h-[450px] rounded-md border border-border bg-[#09090b]" /> }
);

interface ConnectState {
  connected: boolean;
  connectionId: string | null;
  host?: string;
  username?: string;
}

export default function ClawPage() {
  const [connectState, setConnectState] = useState<ConnectState>({
    connected: false,
    connectionId: null,
  });

  const handleConnectionChange = useCallback((state: ConnectState) => {
    setConnectState(state);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Claw</h1>
        <p className="text-muted-foreground">
          Manage your OpenClaw gateway running in the cloud
        </p>
      </div>

      <ConnectionForm onConnectionChange={handleConnectionChange} />

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <StatusPanel
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="logs">
          <LogsViewer
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelsPanel
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsPanel
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="config">
          <ConfigEditor
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="terminal">
          <ClawTerminal
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>

        <TabsContent value="gateway">
          <GatewayControl
            connectionId={connectState.connectionId}
            connected={connectState.connected}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
