"use client";

import type { AgentEventType } from "@/lib/db/schema/postgres/agent";

/**
 * Browser-side helpers. Used by ingest buttons across the app.
 */

interface EmitResult {
  eventId: string;
  storedAs: "inline" | "blob";
}

export async function sendToAgent(
  eventType: AgentEventType,
  payload: unknown,
  sourceRef?: { table: string; id: string },
): Promise<EmitResult> {
  const res = await fetch("/api/agent/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, payload, sourceRef }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? `Failed to emit event: ${res.statusText}`);
  }
  return (await res.json()) as EmitResult;
}

export async function bootstrapAgent(): Promise<{
  enqueued: Record<string, number>;
}> {
  const res = await fetch("/api/agent/bootstrap", { method: "POST" });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? `Bootstrap failed: ${res.statusText}`);
  }
  return (await res.json()) as { enqueued: Record<string, number> };
}
