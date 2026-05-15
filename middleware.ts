/**
 * Root Next.js middleware — Supabase session refresh + cookie handling.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Agent watcher bundle (`myself-op.js`) must be downloadable by curl
    // with no auth — that's the pairing entry point.
    "/((?!_next/static|_next/image|favicon.ico|icons|myself-op\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
