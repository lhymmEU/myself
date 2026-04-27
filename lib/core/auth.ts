/**
 * Unified auth helper used by every action and route handler.
 *
 *   - LOCAL mode  : single user, returns the LOCAL_USER_ID sentinel.
 *   - CLOUD mode  : reads the session from Supabase Auth (validated JWT
 *                   claims, NOT a session lookup) and returns the user's
 *                   uuid. Throws an Error("UNAUTHORIZED") if there is no
 *                   authenticated user — caller is responsible for mapping
 *                   that to a 401 / redirect.
 *
 * Action code should never `if (isCloud())` around auth — just await
 * `getUserId()` and pass it down. That way a single sign-in flow change
 * never has to touch every module.
 */

import { LOCAL_USER_ID, isLocal } from "./runtime";

export class UnauthorizedError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getUserId(): Promise<string> {
  if (isLocal()) return LOCAL_USER_ID;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) {
    throw new UnauthorizedError();
  }
  return sub;
}

/**
 * Same as getUserId but returns null instead of throwing — useful when a
 * route wants to render a public-friendly response.
 */
export async function getUserIdOrNull(): Promise<string | null> {
  try {
    return await getUserId();
  } catch {
    return null;
  }
}
