/**
 * Middleware-side Supabase client + session refresher.
 *
 * Called from the root `middleware.ts` on every request that matches the
 * matcher. It does three things:
 *   1. Reads cookies from the incoming request.
 *   2. Calls supabase.auth.getClaims() to refresh the auth token if needed.
 *   3. Writes any refreshed cookies onto the response so the browser keeps
 *      a fresh session.
 *
 * Per Supabase docs we must use `getClaims()` (which validates the JWT
 * signature) rather than `getSession()` to make any auth decisions.
 *
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/auth",
  "/api/health",
  "/_next",
  "/favicon",
  "/icons",
  "/manifest.json",
  "/sw.js",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: must run before any other auth check so cookies refresh.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;

  if (!claims && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && pathname === "/login") {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.search = "";
    return NextResponse.redirect(dashUrl);
  }

  return response;
}
