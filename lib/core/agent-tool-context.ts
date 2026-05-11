/**
 * Per-request user id for agent tool handlers. `/api/agent` wraps execution in
 * {@link runWithAgentToolUser} so tools like publishDashboard write rows for
 * the authenticated user.
 */
import { AsyncLocalStorage } from "async_hooks";

interface AgentToolStore {
  userId: string;
}

const storage = new AsyncLocalStorage<AgentToolStore>();

export function getAgentToolUserId(): string {
  const id = storage.getStore()?.userId;
  if (!id) {
    throw new Error(
      "Agent tool call missing user context (expected runWithAgentToolUser).",
    );
  }
  return id;
}

export function runWithAgentToolUser<T>(
  userId: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run({ userId }, fn);
}
