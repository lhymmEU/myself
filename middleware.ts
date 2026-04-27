/**
 * Root Next.js middleware.
 *
 * In LOCAL mode this is a no-op — the dashboard runs single-user with no
 * auth, so we just pass every request through.
 *
 * In CLOUD mode it delegates to the Supabase session refresher, which
 * validates the JWT, refreshes cookies, and redirects unauthenticated
 * traffic to /login.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isCloud } from "@/lib/core/runtime";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!isCloud()) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *  - _next/static, _next/image (build assets)
     *  - favicon.ico, icons/*
     *  - public images / fonts
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
