/**
 * Sign-out endpoint.
 *
 * POST /auth/signout — clears the Supabase session cookies and redirects
 * to /login. In local mode this just redirects to /dashboard since there
 * is no session to clear.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isLocal } from "@/lib/core/runtime";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isLocal()) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
