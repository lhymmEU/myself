import type { EventHandler, EventPayload } from "./types";

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  subscribe(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  async emit(module: string, type: string, data: unknown) {
    const payload: EventPayload = {
      type,
      module,
      data,
      timestamp: Date.now(),
    };

    const handlers = this.handlers.get(type);
    if (handlers) {
      const promises = Array.from(handlers).map((handler) => handler(payload));
      await Promise.allSettled(promises);
    }
  }
}

export const eventBus = new EventBus();
