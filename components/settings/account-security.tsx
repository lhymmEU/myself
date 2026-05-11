"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
export function AccountSecurity() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent("/dashboard/settings")}`;

  async function onSetPassword(e: FormEvent) {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy("password");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password saved. You can sign in with email + password.");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setBusy(null);
    }
  }

  async function linkOAuth(provider: "google" | "github") {
    setBusy(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Account security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Link multiple sign-in methods so Supabase keeps a single user id. Use
          the same email across providers when possible, or link while signed in
          here. If you only ever used a magic link, saving a password here (or
          using “Email me a password link” on the login page) lets you use the
          password tab next time.
        </p>
      </div>

      <form onSubmit={onSetPassword} className="space-y-3 max-w-md">
        <Label htmlFor="acct-password">Set or change password</Label>
        <Input
          id="acct-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={!!busy}
        />
        <Button type="submit" disabled={!!busy}>
          {busy === "password" ? "Saving…" : "Save password"}
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium">Link OAuth provider</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={() => void linkOAuth("google")}
          >
            {busy === "google" ? "…" : "Link Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={() => void linkOAuth("github")}
          >
            {busy === "github" ? "…" : "Link GitHub"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Configure providers in the Supabase dashboard. You can enable automatic
        linking for accounts that share the same verified email.
      </p>
    </div>
  );
}
