/**
 * Login page (cloud mode only).
 *
 * In local mode this page is unreachable in normal flows because the
 * middleware skips auth, but if someone hits it directly we still redirect
 * to the dashboard so the page never renders an unusable form.
 */

import { redirect } from "next/navigation";
import { isLocal } from "@/lib/core/runtime";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (isLocal()) {
    redirect("/dashboard");
  }

  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Life Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with a magic link — no password needed.
          </p>
        </div>
        <LoginForm next={next ?? "/dashboard"} initialError={error} />
        <p className="text-center text-xs text-muted-foreground">
          By signing in you accept that this is a hosted preview. For full
          control, install locally — see the README.
        </p>
      </div>
    </div>
  );
}
