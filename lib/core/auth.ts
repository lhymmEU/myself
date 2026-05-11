/**
 * Unified auth helper used by every action and route handler.
 *
 * Reads the session from Supabase Auth (validated JWT claims, NOT a session
 * lookup) and returns the user's uuid. Throws `UnauthorizedError` if there is
 * no authenticated user — caller maps that to 401 / redirect.
 */

import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getUserId(): Promise<string> {
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
