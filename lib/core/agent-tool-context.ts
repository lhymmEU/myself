/**
 * Per-request user id for agent tool handlers. `/api/agent` wraps execution in
 * {@link runWithAgentToolUser} so tools like publishDashboard write rows for
 * the authenticated user — matching GET /api/dashboard/insights (critical in
 * cloud mode where userId is a Supabase uuid, not LOCAL_USER_ID).
 */
import { AsyncLocalStorage } from "async_hooks";
import { LOCAL_USER_ID } from "./runtime";

interface AgentToolStore {
  userId: string;
}

const storage = new AsyncLocalStorage<AgentToolStore>();

export function getAgentToolUserId(): string {
  return storage.getStore()?.userId ?? LOCAL_USER_ID;
}

export function runWithAgentToolUser<T>(
  userId: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run({ userId }, fn);
}
