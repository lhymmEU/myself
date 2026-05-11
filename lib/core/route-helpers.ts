/**
 * Small helpers that every Route Handler can use to extract the current
 * user id and short-circuit on unauthorized requests.
 *
 * Usage:
 *   export async function GET() {
 *     const auth = await requireUserId();
 *     if ("response" in auth) return auth.response;
 *     const { userId } = auth;
 *     ...
 *   }
 *
 * `userId` is always the Supabase Auth subject (uuid). Middleware enforces
 * login on protected routes; this helper re-checks as defence in depth.
 */

import { NextResponse } from "next/server";
import { UnauthorizedError, getUserId } from "./auth";

export type RequireUserIdResult =
  | { userId: string }
  | { response: NextResponse };

export async function requireUserId(): Promise<RequireUserIdResult> {
  try {
    return { userId: await getUserId() };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return {
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }
    throw err;
  }
}
