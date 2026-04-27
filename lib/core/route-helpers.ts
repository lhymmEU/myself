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
 * In local mode `userId` is the LOCAL_USER_ID sentinel and the path never
 * fails. In cloud mode the middleware already enforces login on /api/*
 * but we still re-check here as defence in depth (and to grab the uuid).
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
