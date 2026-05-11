import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { setOpenclawRefreshToken } from "@/lib/modules/dashboard/openclaw-token-actions";
import { extractRefreshTokenFromSupabaseAuthCookies } from "@/lib/supabase/session-cookie-refresh-token";

bootApp();

/**
 * POST — copy `refresh_token` from the current browser Supabase session cookie
 * into encrypted OpenClaw storage (same as manual paste + save).
 */
export async function POST() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const jar = await cookies();
  const refresh = extractRefreshTokenFromSupabaseAuthCookies(jar.getAll());
  if (!refresh) {
    return NextResponse.json(
      {
        error:
          "Could not read a refresh token from your session cookies. Stay logged in on this site and try again, or paste the token manually.",
      },
      { status: 400 },
    );
  }

  try {
    await setOpenclawRefreshToken(auth.userId, refresh);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
