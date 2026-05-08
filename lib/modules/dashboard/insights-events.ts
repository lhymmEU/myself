/**
 * Server-side event handlers that turn plans / marked / wishlist mutations
 * into "sources changed" signals in the wiki log. The next time openclaw
 * runs in wiki-maintainer mode it can grep log.md for `signal` lines and
 * decide whether re-ingest is worth the cost.
 *
 * We deliberately only append to log.md and emit a domain-level
 * `dashboard:ingest_needed` event — actual openclaw invocation happens
 * client-side via /api/claw/chat with `wikiPreamble: true`. That keeps
 * the SSH/SSE stream tied to the browser and avoids needing a server queue.
 */
import type { EventHandler } from "@/lib/core/types";
import { ensureVault, appendLog } from "./wiki-vault";
import { isLocal } from "@/lib/core/runtime";

function nowIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

let lastSignalAt = 0;
const DEBOUNCE_MS = 5_000;

function logSignal(module: string, op: string, summary: string): void {
  if (!isLocal()) return;
  const now = Date.now();
  // Coalesce bursts. Anything tighter than DEBOUNCE_MS gets dropped because the
  // user hasn't looked at the bento yet anyway and we already logged the first.
  if (now - lastSignalAt < DEBOUNCE_MS) return;
  lastSignalAt = now;
  ensureVault();
  appendLog(`## [${nowIsoDate()}] signal | ${module}:${op} | ${summary}`);
}

const planSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; title?: string } | undefined;
  logSignal("plans", payload.type.replace(/^plans:/, ""), data?.title ?? data?.id ?? "?");
};

const markedSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; url?: string; name?: string } | undefined;
  logSignal(
    "marked",
    payload.type.replace(/^marked:/, ""),
    data?.url ?? data?.name ?? data?.id ?? "?",
  );
};

const wishSignal: EventHandler = (payload) => {
  const data = payload.data as { id?: string; name?: string } | undefined;
  logSignal(
    "wishlist",
    payload.type.replace(/^dashboard:/, ""),
    data?.name ?? data?.id ?? "?",
  );
};

export const insightEventHandlers: Record<string, EventHandler> = {
  // Plans
  "plans:created": planSignal,
  "plans:updated": planSignal,
  "plans:deleted": planSignal,
  // Marked
  "marked:item_created": markedSignal,
  "marked:item_updated": markedSignal,
  "marked:item_deleted": markedSignal,
  "marked:collection_created": markedSignal,
  "marked:collection_updated": markedSignal,
  "marked:collection_deleted": markedSignal,
  // Wishlist (re-emitted from dashboard module)
  "dashboard:wish_created": wishSignal,
  "dashboard:wish_updated": wishSignal,
  "dashboard:wish_deleted": wishSignal,
};
