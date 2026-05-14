/**
 * Server-side handlers that react to dashboard data changes. Signals are
 * lightweight: clients can use pending dismissal counts to decide when to
 * nudge openclaw (wiki + card refresh on the agent host).
 */
import type { EventHandler } from "@/lib/core/types";
import { getUserId } from "@/lib/core/auth";

let lastSignalAt = 0;
const DEBOUNCE_MS = 5_000;

async function logSignal(
  _module: string,
  _op: string,
  _summary: string,
): Promise<void> {
  const now = Date.now();
  if (now - lastSignalAt < DEBOUNCE_MS) return;
  lastSignalAt = now;
  try {
    await getUserId();
    /* Wiki log removed — vault lives on OpenClaw host only. */
  } catch {
    /* no session */
  }
}

const planSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; title?: string } | undefined;
  void logSignal(
    "plans",
    payload.type.replace(/^plans:/, ""),
    data?.title ?? data?.id ?? "?",
  );
};

const markedSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; url?: string; name?: string } | undefined;
  void logSignal(
    "marked",
    payload.type.replace(/^marked:/, ""),
    data?.url ?? data?.name ?? data?.id ?? "?",
  );
};

const wishSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; name?: string } | undefined;
  void logSignal(
    "wishlist",
    payload.type.replace(/^dashboard:/, ""),
    data?.name ?? data?.id ?? "?",
  );
};

export const insightEventHandlers: Record<string, EventHandler> = {
  "plans:created": planSignal,
  "plans:updated": planSignal,
  "plans:deleted": planSignal,
  "marked:item_created": markedSignal,
  "marked:item_updated": markedSignal,
  "marked:item_deleted": markedSignal,
  "marked:collection_created": markedSignal,
  "marked:collection_updated": markedSignal,
  "marked:collection_deleted": markedSignal,
  "dashboard:wish_created": wishSignal,
  "dashboard:wish_updated": wishSignal,
  "dashboard:wish_deleted": wishSignal,
};
