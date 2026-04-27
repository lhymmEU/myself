"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/context";
import { StatusPanel } from "@/components/claw/status-panel";
import { LogsViewer } from "@/components/claw/logs-viewer";
import { ChannelsPanel } from "@/components/claw/channels-panel";
import { SessionsPanel } from "@/components/claw/sessions-panel";
import { ConfigEditor } from "@/components/claw/config-editor";
import { GatewayControl } from "@/components/claw/gateway-control";
import { MemoriesPanel } from "@/components/claw/memories-panel";
import { SoulEditor } from "@/components/claw/soul-editor";
import { FilesPanel } from "@/components/claw/files-panel";
import { ExtendPanel } from "@/components/claw/extend-panel";
import { SkillsMarketplace } from "@/components/claw/skills-marketplace";
import { SkillEditor } from "@/components/claw/skill-editor";
import { CliToolsPanel } from "@/components/claw/cli-tools-panel";
import { PublicApisPanel } from "@/components/claw/public-apis-panel";
import { isCloud, isLocal } from "@/lib/core/runtime";
import { useClawConnections } from "@/lib/swr/hooks";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const ClawTerminal = dynamic(
  () => import("@/components/claw/terminal").then((m) => m.ClawTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] rounded-md border border-border bg-[#09090b]" />
    ),
  },
);

const EdgeTerminal = dynamic(
  () =>
    import("@/components/claw/edge-terminal").then((m) => m.EdgeTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] rounded-md border border-border bg-[#09090b]" />
    ),
  },
);

interface ClawConnectionRow {
  id: string;
  name: string;
  transport?: "ssh" | "relay" | "edge";
  credentialSecretId?: string;
  hostKeyFingerprint?: string;
}

const PILL =
  "flex-none rounded-full border px-4 py-1.5 data-[state=active]:bg-muted data-[state=active]:border-border";

interface ClawAdvancedViewProps {
  connectionId: string | null;
  connected: boolean;
}

export function ClawAdvancedView({
  connectionId,
  connected,
}: ClawAdvancedViewProps) {
  const t = useT();
  const { data: connectionsData } = useClawConnections();
  const activeConnection = useMemo<ClawConnectionRow | null>(() => {
    if (!connectionId) return null;
    const list = (Array.isArray(connectionsData)
      ? connectionsData
      : []) as ClawConnectionRow[];
    return list.find((c) => c.id === connectionId) ?? null;
  }, [connectionId, connectionsData]);

  const isEdgeConnection = activeConnection?.transport === "edge";
  // Edge transport works in cloud mode and runs entirely in the browser,
  // so it's safe to render whenever the connection row is set up for it.
  // The legacy SSH terminal stays local-only because it shells out via ssh2.
  const showLocalTerminal = isLocal() && !isEdgeConnection;
  const showEdgeTerminal = isCloud() && isEdgeConnection;
  const showTerminalTab = showLocalTerminal || showEdgeTerminal;

  return (
    <div className="flex gap-6 items-start">
      <div className="w-1/2 min-w-0">
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList
            variant="line"
            className="flex flex-wrap gap-2 w-full mb-12"
          >
            <TabsTrigger value="status" className={PILL}>
              {t("claw.tabs.status")}
            </TabsTrigger>
            <TabsTrigger value="logs" className={PILL}>
              {t("claw.tabs.logs")}
            </TabsTrigger>
            <TabsTrigger value="channels" className={PILL}>
              {t("claw.tabs.channels")}
            </TabsTrigger>
            <TabsTrigger value="sessions" className={PILL}>
              {t("claw.tabs.sessions")}
            </TabsTrigger>
            <TabsTrigger value="config" className={PILL}>
              {t("claw.tabs.config")}
            </TabsTrigger>
            {showTerminalTab && (
              <TabsTrigger value="terminal" className={PILL}>
                {t("claw.tabs.terminal")}
              </TabsTrigger>
            )}
            <TabsTrigger value="gateway" className={PILL}>
              {t("claw.tabs.gateway")}
            </TabsTrigger>
            <TabsTrigger value="memories" className={PILL}>
              {t("claw.tabs.memories")}
            </TabsTrigger>
            <TabsTrigger value="soul" className={PILL}>
              {t("claw.tabs.soul")}
            </TabsTrigger>
            <TabsTrigger value="files" className={PILL}>
              {t("claw.tabs.files")}
            </TabsTrigger>
            <TabsTrigger value="extend" className={PILL}>
              {t("claw.tabs.extend")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <StatusPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="logs">
            <LogsViewer connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="channels">
            <ChannelsPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="sessions">
            <SessionsPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="config">
            <ConfigEditor connectionId={connectionId} connected={connected} />
          </TabsContent>
          {showTerminalTab && (
            <TabsContent value="terminal">
              {showEdgeTerminal ? (
                <EdgeTerminal
                  connectionId={connectionId}
                  connection={activeConnection}
                />
              ) : (
                <ClawTerminal
                  connectionId={connectionId}
                  connected={connected}
                />
              )}
            </TabsContent>
          )}
          <TabsContent value="gateway">
            <GatewayControl connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="memories">
            <MemoriesPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="soul">
            <SoulEditor connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="files">
            <FilesPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
          <TabsContent value="extend">
            <ExtendPanel connectionId={connectionId} connected={connected} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="w-1/2 min-w-0 flex flex-col gap-4">
        <Tabs defaultValue="market">
          <TabsList className="grid w-full grid-cols-3 h-7 mb-2">
            <TabsTrigger value="market" className="text-xs h-6">
              {t("claw.rightTabs.market")}
            </TabsTrigger>
            <TabsTrigger value="cli" className="text-xs h-6">
              {t("claw.rightTabs.cliTools")}
            </TabsTrigger>
            <TabsTrigger value="apis" className="text-xs h-6">
              {t("claw.rightTabs.publicApis")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="market">
            <SkillsMarketplace
              connectionId={connectionId}
              connected={connected}
            />
          </TabsContent>
          <TabsContent value="cli">
            <CliToolsPanel />
          </TabsContent>
          <TabsContent value="apis">
            <PublicApisPanel />
          </TabsContent>
        </Tabs>
        <div>
          <SkillEditor connectionId={connectionId} connected={connected} />
        </div>
      </div>
    </div>
  );
}
