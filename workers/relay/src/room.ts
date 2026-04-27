/**
 * Durable Object: one instance per pairing token. Hosts the two WebSocket
 * peers (lobsterd agent + browser) and pipes bytes between them.
 *
 * Lifecycle:
 *   1. First peer connects → parked, waiting for partner.
 *   2. Second peer with the matching role connects → both sides start
 *      forwarding. We send a "ready" control frame so the app can show
 *      a "connected" state in the UI.
 *   3. If either side disconnects, the other gets a "peer_disconnected"
 *      control frame and the DO clears its state.
 *
 * We DO NOT decrypt. The peers carry their own NaCl/X25519 session
 * (negotiated during pairing); we only see ciphertext frames here.
 */

import type { Env } from "./index";

type Role = "agent" | "browser";

interface Slot {
  ws: WebSocket;
  userId: string;
}

const CONTROL_PREFIX = "\u0001ctrl:";

function controlFrame(message: string): string {
  return `${CONTROL_PREFIX}${message}`;
}

export class RelayRoom {
  private state: DurableObjectState;
  private agent: Slot | null = null;
  private browser: Slot | null = null;
  private pairingToken: string | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const role = request.headers.get("X-Relay-Role") as Role | null;
    const userId = request.headers.get("X-Relay-User");
    const pairingToken = request.headers.get("X-Relay-Pairing");

    if (!role || !userId || !pairingToken) {
      return new Response("Missing relay headers", { status: 400 });
    }

    // First peer to arrive sets the user this DO is bound to. Subsequent
    // peers must match — otherwise someone is trying to splice into another
    // user's pairing.
    if (this.pairingToken === null) {
      this.pairingToken = pairingToken;
    } else if (this.pairingToken !== pairingToken) {
      return new Response("Pairing token mismatch", { status: 403 });
    }

    const existing = role === "agent" ? this.agent : this.browser;
    const otherUserId =
      this.agent?.userId ?? this.browser?.userId ?? null;
    if (otherUserId && otherUserId !== userId) {
      return new Response("User mismatch", { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();

    const slot: Slot = { ws: server, userId };

    if (existing) {
      try {
        existing.ws.close(4001, "replaced by new connection");
      } catch {
        // ignored
      }
    }

    if (role === "agent") {
      this.agent = slot;
    } else {
      this.browser = slot;
    }

    this.wireUp(role, slot);

    if (this.agent && this.browser) {
      this.notifyReady();
    } else {
      try {
        slot.ws.send(controlFrame("waiting_for_peer"));
      } catch {
        // ignored
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private wireUp(role: Role, slot: Slot): void {
    slot.ws.addEventListener("message", (event) => {
      const partner = role === "agent" ? this.browser : this.agent;
      if (!partner) return;
      try {
        if (typeof event.data === "string") {
          if (event.data.startsWith(CONTROL_PREFIX)) return;
          partner.ws.send(event.data);
        } else {
          partner.ws.send(event.data as ArrayBuffer);
        }
      } catch {
        // partner closed; let close handler clean up.
      }
    });

    const cleanUp = () => {
      const partner = role === "agent" ? this.browser : this.agent;
      if (role === "agent") {
        this.agent = null;
      } else {
        this.browser = null;
      }
      if (partner) {
        try {
          partner.ws.send(controlFrame("peer_disconnected"));
        } catch {
          // ignored
        }
      }
    };

    slot.ws.addEventListener("close", cleanUp);
    slot.ws.addEventListener("error", cleanUp);
  }

  private notifyReady(): void {
    for (const slot of [this.agent, this.browser]) {
      if (!slot) continue;
      try {
        slot.ws.send(controlFrame("ready"));
      } catch {
        // ignored
      }
    }
  }
}
