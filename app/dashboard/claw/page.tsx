"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { ConnectionSetup } from "@/components/claw/connection-setup";
import {
  ConnectionsManager,
  type ClawConnectionSummary,
} from "@/components/claw/connections-manager";
import { Chat } from "@/components/claw/chat";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { swrFetcher } from "@/lib/swr/config";

interface ConnectionsResponse {
  connections: ClawConnectionSummary[];
}

export default function ClawPage() {
  const { data, error, isLoading, mutate } = useSWR<ConnectionsResponse>(
    "/api/claw/connections",
    swrFetcher,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  const connections = useMemo(
    () => data?.connections ?? [],
    [data?.connections],
  );

  const activeConnectionId =
    selectedId && connections.some((c) => c.id === selectedId)
      ? selectedId
      : (connections.find((c) => c.isDefault) ?? connections[0])?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load connections: {String(error.message ?? error)}
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <ConnectionSetup
        onCreated={async () => {
          await mutate();
        }}
      />
    );
  }

  const active = connections.find((c) => c.id === activeConnectionId);
  if (!active) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleDeleteActive() {
    const c = connections.find((x) => x.id === activeConnectionId);
    if (!c) return;
    const confirmed = window.confirm(
      `Forget connection "${c.name}"? The remote agent itself is unaffected.`,
    );
    if (!confirmed) return;
    await fetch(`/api/claw/connections?id=${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    });
    await mutate();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <Sheet open={connectionsOpen} onOpenChange={setConnectionsOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <ConnectionsManager
            connections={connections}
            activeId={activeConnectionId}
            onActiveChange={(id) => {
              setSelectedId(id);
              setConnectionsOpen(false);
            }}
            onMutate={mutate}
          />
        </SheetContent>
      </Sheet>

      <div className="min-h-0 flex-1 flex flex-col">
        <Chat
          key={active.id}
          connectionId={active.id}
          connectionName={`${active.username}@${active.host}`}
          onDelete={handleDeleteActive}
          onManageConnections={() => setConnectionsOpen(true)}
        />
      </div>
    </div>
  );
}
