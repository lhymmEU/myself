/**
 * Server-side Supabase client.
 *
 * Used in Server Components, Server Actions, and Route Handlers. A new
 * instance must be created per request so it can read the request's
 * cookies — see https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * `setAll` is wrapped in try/catch because Server Components are not
 * allowed to mutate cookies. The middleware (`middleware.ts` at the repo
 * root) is what actually persists refreshed auth cookies on every request.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll was called from a Server Component — the middleware will
          // refresh the session on the next request, so this is safe to ignore.
        }
      },
    },
  });
}
