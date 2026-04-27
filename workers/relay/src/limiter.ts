/**
 * Per-user concurrent dial-session limiter.
 *
 * One Durable Object instance per `userId` (allocated via
 * `idFromName(userId)`). Tracks how many `/dial` WebSocket bridges that
 * user has open right now and rejects new ones above the cap.
 *
 * The state lives only in the DO's in-memory map — sessions are
 * inherently ephemeral, so there's no point persisting to storage. If
 * the DO evicts mid-session the counter resets to 0, which is benign:
 * the cap is a fairness/budget guard, not a security control.
 *
 * Endpoints (called via `stub.fetch(new Request(...))`):
 *   POST /acquire           → 200 { ok: true } | 429 { error }
 *   POST /release           → 200 { ok: true }
 *   GET  /count             → 200 { count }
 *
 * The cap is read from env `DIAL_MAX_CONCURRENT_PER_USER` (default 5).
 */

import type { Env } from "./index";

const DEFAULT_CAP = 5;

export class DialLimiter {
  private state: DurableObjectState;
  private env: Env;
  private active = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    void this.state.blockConcurrencyWhile(async () => {
      const persisted = await this.state.storage.get<number>("active");
      this.active = typeof persisted === "number" ? persisted : 0;
    });
  }

  private cap(): number {
    const raw = this.env.DIAL_MAX_CONCURRENT_PER_USER;
    if (!raw) return DEFAULT_CAP;
    const parsed = typeof raw === "string" ? parseInt(raw, 10) : raw;
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CAP;
    return parsed;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/acquire" && request.method === "POST") {
      const cap = this.cap();
      if (this.active >= cap) {
        return Response.json(
          {
            ok: false,
            error: `Concurrent session cap reached (${this.active}/${cap}). Close a session and try again.`,
            active: this.active,
            cap,
          },
          { status: 429 },
        );
      }
      this.active += 1;
      await this.state.storage.put("active", this.active);
      return Response.json({ ok: true, active: this.active, cap });
    }

    if (url.pathname === "/release" && request.method === "POST") {
      if (this.active > 0) {
        this.active -= 1;
        await this.state.storage.put("active", this.active);
      }
      return Response.json({ ok: true, active: this.active });
    }

    if (url.pathname === "/count" && request.method === "GET") {
      return Response.json({ active: this.active, cap: this.cap() });
    }

    return new Response("Not Found", { status: 404 });
  }
}
