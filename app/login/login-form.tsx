"use client";

/**
 * Magic-link login form.
 *
 * We deliberately keep the surface small for the hosted preview: email-only
 * magic links. OAuth providers (GitHub, Google) can be added by enabling
 * them in the Supabase dashboard and dropping a button here that calls
 * `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`.
 */

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  next: string;
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "sending" }
    | { state: "sent" }
    | { state: "error"; message: string }
  >(initialError ? { state: "error", message: initialError } : { state: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      setStatus({ state: "sent" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  if (status.state === "sent") {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          We sent a sign-in link to <span className="font-mono">{email}</span>.
          Click it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status.state === "sending"}
        />
      </div>
      {status.state === "error" && (
        <p className="text-sm text-destructive">{status.message}</p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={status.state === "sending" || !email}
      >
        {status.state === "sending" ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
