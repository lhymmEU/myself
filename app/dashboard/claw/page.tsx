"use client";

import { useState, useCallback, useReducer } from "react";
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
import { MemoriesPanel } from "@/components/claw/memories-panel";
import { SoulEditor } from "@/components/claw/soul-editor";
import { FilesPanel } from "@/components/claw/files-panel";
import { InstalledSkillsPanel } from "@/components/claw/installed-skills-panel";
import { SkillsMarketplace } from "@/components/claw/skills-marketplace";
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

  const [installedRefreshKey, bumpInstalledRefresh] = useReducer((c: number) => c + 1, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Claw</h1>
        <p className="text-muted-foreground">
          Manage your OpenClaw gateway running in the cloud
        </p>
      </div>

      <ConnectionForm onConnectionChange={handleConnectionChange} />

      <div className="flex gap-6 items-start">
        {/* Left half: existing tabs + Memories */}
        <div className="w-1/2 min-w-0">
          <Tabs defaultValue="status" className="space-y-4">
            <TabsList variant="line" className="flex flex-wrap gap-2 w-full">
              <TabsTrigger value="status" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Status</TabsTrigger>
              <TabsTrigger value="logs" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Logs</TabsTrigger>
              <TabsTrigger value="channels" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Channels</TabsTrigger>
              <TabsTrigger value="sessions" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Sessions</TabsTrigger>
              <TabsTrigger value="config" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Config</TabsTrigger>
              <TabsTrigger value="terminal" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Terminal</TabsTrigger>
              <TabsTrigger value="gateway" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Gateway</TabsTrigger>
              <TabsTrigger value="memories" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Memories</TabsTrigger>
              <TabsTrigger value="soul" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Soul</TabsTrigger>
              <TabsTrigger value="files" className="flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border">Files</TabsTrigger>
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

            <TabsContent value="memories">
              <MemoriesPanel
                connectionId={connectState.connectionId}
                connected={connectState.connected}
              />
            </TabsContent>

            <TabsContent value="soul">
              <SoulEditor
                connectionId={connectState.connectionId}
                connected={connectState.connected}
              />
            </TabsContent>

            <TabsContent value="files">
              <FilesPanel
                connectionId={connectState.connectionId}
                connected={connectState.connected}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right half: Installed Skills (top) + Marketplace (bottom) */}
        <div className="w-1/2 min-w-0 flex flex-col gap-4">
          <div className="h-[250px]">
            <InstalledSkillsPanel
              connectionId={connectState.connectionId}
              connected={connectState.connected}
              refreshKey={installedRefreshKey}
            />
          </div>
          <div>
            <SkillsMarketplace
              connectionId={connectState.connectionId}
              connected={connectState.connected}
              onSkillInstalled={bumpInstalledRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
