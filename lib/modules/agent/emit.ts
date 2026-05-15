import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { agentEvents, type AgentEventType } from "@/lib/db/schema/postgres/agent";
import { createClient } from "@/lib/supabase/server";

const INLINE_MAX_BYTES = 256 * 1024;
const BLOB_BUCKET = "agent-event-blobs";

export interface EmitEventInput {
  userId: string;
  eventType: AgentEventType;
  payload: unknown;
  sourceRef?: { table: string; id: string };
}

export interface EmitResult {
  eventId: string;
  storedAs: "inline" | "blob";
}

/**
 * Push one event onto the agent's queue.
 *
 * Payloads up to 256 KB are stored inline in the `payload` JSONB column.
 * Larger payloads are uploaded to the `agent-event-blobs` Storage bucket
 * at `{userId}/{eventId}.json` and `blob_path` points to the object.
 *
 * The agent processes events strictly serially by `created_at` per user;
 * call this once per discrete content item (page, marked item, wish, etc.).
 */
export async function emitEvent(input: EmitEventInput): Promise<EmitResult> {
  const eventId = randomUUID();
  const now = Date.now();
  const serialized = JSON.stringify(input.payload);
  const byteSize = Buffer.byteLength(serialized, "utf8");

  let inlinePayload: unknown = input.payload;
  let blobPath: string | null = null;
  let storedAs: "inline" | "blob" = "inline";

  if (byteSize > INLINE_MAX_BYTES) {
    blobPath = `${input.userId}/${eventId}.json`;
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BLOB_BUCKET)
      .upload(blobPath, serialized, {
        contentType: "application/json",
        upsert: false,
      });
    if (error) {
      throw new Error(`Failed to upload agent event blob: ${error.message}`);
    }
    inlinePayload = null;
    storedAs = "blob";
  }

  await getDb().insert(agentEvents).values({
    id: eventId,
    userId: input.userId,
    eventType: input.eventType,
    payload: inlinePayload as never,
    blobPath,
    sourceRef: (input.sourceRef ?? null) as never,
    status: "pending",
    createdAt: now,
  });

  return { eventId, storedAs };
}
