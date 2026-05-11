"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  next: string;
  initialError?: string;
}

type SentKind = "magic" | "password_reset" | "signup_confirm";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; kind: SentKind }
  | { state: "error"; message: string };

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [status, setStatus] = useState<Status>(
    initialError ? { state: "error", message: initialError } : { state: "idle" },
  );

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const passwordSetupRedirect = `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  async function handleMagicLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      setStatus({ state: "sent", kind: "magic" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  async function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      window.location.href = next.startsWith("/") ? next : "/dashboard";
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  async function handlePasswordSetupEmail() {
    if (!email) {
      setStatus({
        state: "error",
        message: "Enter your email above first.",
      });
      return;
    }
    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordSetupRedirect,
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      setStatus({ state: "sent", kind: "password_reset" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !signUpPassword) return;
    if (signUpPassword.length < 8) {
      setStatus({
        state: "error",
        message: "Password must be at least 8 characters.",
      });
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setStatus({ state: "error", message: "Passwords do not match." });
      return;
    }
    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signUpPassword,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      if (data.session) {
        window.location.href = next.startsWith("/") ? next : "/dashboard";
        return;
      }
      setStatus({ state: "sent", kind: "signup_confirm" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  async function signInWithOAuth(provider: "google" | "github") {
    setStatus({ state: "sending" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
      }
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  if (status.state === "sent") {
    if (status.kind === "magic") {
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
    if (status.kind === "password_reset") {
      return (
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          <p className="font-medium">Check your inbox</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for{" "}
            <span className="font-mono">{email}</span>, we sent a link to set or
            reset your password. Open it on this device, then choose a new
            password on the next screen.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm">
        <p className="font-medium">Confirm your email</p>
        <p className="mt-1 text-muted-foreground">
          We sent a confirmation link to <span className="font-mono">{email}</span>
          . After you confirm, you can sign in with email and password here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="magic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="magic">Magic link</TabsTrigger>
          <TabsTrigger value="password">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="magic" className="mt-4">
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-magic">Email</Label>
              <Input
                id="email-magic"
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
        </TabsContent>
        <TabsContent value="password" className="mt-4">
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-pass">Email</Label>
              <Input
                id="email-pass"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status.state === "sending"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status.state === "sending"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Only works if you already set a password. If you previously used
              only a magic link or OAuth, use the button below or sign in with
              magic link and set a password under Settings → Account security.
            </p>
            {status.state === "error" && (
              <p className="text-sm text-destructive">{status.message}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={status.state === "sending" || !email || !password}
            >
              {status.state === "sending" ? "Signing in…" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={status.state === "sending" || !email}
              onClick={() => void handlePasswordSetupEmail()}
            >
              Email me a password link
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup" className="mt-4">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup">Email</Label>
              <Input
                id="email-signup"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status.state === "sending"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                disabled={status.state === "sending"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirm password</Label>
              <Input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={signUpConfirm}
                onChange={(e) => setSignUpConfirm(e.target.value)}
                disabled={status.state === "sending"}
              />
            </div>
            {status.state === "error" && (
              <p className="text-sm text-destructive">{status.message}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                status.state === "sending" ||
                !email ||
                !signUpPassword ||
                !signUpConfirm
              }
            >
              {status.state === "sending" ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={status.state === "sending"}
          onClick={() => void signInWithOAuth("google")}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={status.state === "sending"}
          onClick={() => void signInWithOAuth("github")}
        >
          GitHub
        </Button>
      </div>
    </div>
  );
}
