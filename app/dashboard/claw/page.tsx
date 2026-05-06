"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { ConnectionSetup } from "@/components/claw/connection-setup";
import { Chat } from "@/components/claw/chat";
import { swrFetcher } from "@/lib/swr/config";

interface ConnectionSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ConnectionsResponse {
  connections: ConnectionSummary[];
}

export default function ClawPage() {
  const { data, error, isLoading, mutate } = useSWR<ConnectionsResponse>(
    "/api/claw/connections",
    swrFetcher,
  );

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

  const connections = data?.connections ?? [];
  if (connections.length === 0) {
    return (
      <ConnectionSetup
        onCreated={async () => {
          await mutate();
        }}
      />
    );
  }

  const active =
    connections.find((c) => c.isDefault) ?? connections[0];

  async function handleDelete() {
    const confirmed = window.confirm(
      `Forget connection "${active.name}"? The remote agent itself is unaffected.`,
    );
    if (!confirmed) return;
    await fetch(`/api/claw/connections?id=${encodeURIComponent(active.id)}`, {
      method: "DELETE",
    });
    await mutate();
  }

  return (
    <Chat
      connectionId={active.id}
      connectionName={`${active.username}@${active.host}`}
      onDelete={handleDelete}
    />
  );
}
