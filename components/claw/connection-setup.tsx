"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  fetchSecret,
  fetchVaultStatus,
  listSecrets,
} from "@/lib/modules/vault/api";
import type { VaultSecretMeta } from "@/lib/modules/vault/types";

interface Props {
  onCreated: () => void | Promise<void>;
}

type AuthMethod = "password" | "key";

interface FormState {
  name: string;
  host: string;
  port: string;
  username: string;
  authMethod: AuthMethod;
  password: string;
  privateKey: string;
  passphrase: string;
}

const INITIAL: FormState = {
  name: "",
  host: "",
  port: "22",
  username: "",
  authMethod: "password",
  password: "",
  privateKey: "",
  passphrase: "",
};

export function ConnectionSetup({ onCreated }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultMeta, setVaultMeta] = useState<VaultSecretMeta[]>([]);
  const [vaultLoadState, setVaultLoadState] = useState<
    "idle" | "loading" | "ready" | "locked" | "error"
  >("idle");
  const [vaultSecretLoading, setVaultSecretLoading] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<string>("");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (form.authMethod !== "key") {
      setVaultLoadState("idle");
      return;
    }

    let cancelled = false;
    setVaultLoadState("loading");
    (async () => {
      try {
        const status = await fetchVaultStatus();
        if (cancelled) return;
        if (!status.unlocked) {
          setVaultMeta([]);
          setVaultLoadState("locked");
          return;
        }
        const secrets = await listSecrets();
        if (cancelled) return;
        setVaultMeta(secrets);
        setVaultLoadState("ready");
      } catch {
        if (!cancelled) {
          setVaultMeta([]);
          setVaultLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.authMethod]);

  async function applyVaultSecret(id: string) {
    if (id === "__none__") {
      setSelectedVaultId("");
      return;
    }
    setSelectedVaultId(id);
    setVaultSecretLoading(true);
    setError(null);
    try {
      const secret = await fetchSecret(id);
      if (!secret?.value?.trim()) {
        setError("Selected vault entry had no value");
        return;
      }
      update("privateKey", secret.value);
    } catch {
      setError("Could not load secret from vault");
    } finally {
      setVaultSecretLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
      setError("Name, host, and username are required");
      return;
    }
    const port = Number(form.port) || 22;
    const payload = {
      name: form.name.trim(),
      host: form.host.trim(),
      port,
      username: form.username.trim(),
      authMethod: form.authMethod,
      password: form.authMethod === "password" ? form.password : null,
      privateKey: form.authMethod === "key" ? form.privateKey : null,
      passphrase:
        form.authMethod === "key" && form.passphrase
          ? form.passphrase
          : null,
    };
    setSubmitting(true);
    try {
      const res = await fetch("/api/claw/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save connection");
        return;
      }
      setForm(INITIAL);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect to your openclaw agent</CardTitle>
          <CardDescription>
            Set up an SSH connection so this page can relay your messages
            to the remote `openclaw agent` and stream the reply back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. home server"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={form.host}
                  onChange={(e) => update("host", e.target.value)}
                  placeholder="example.com or 192.168.1.10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  inputMode="numeric"
                  value={form.port}
                  onChange={(e) => update("port", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="claw"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Auth method</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.authMethod === "password" ? "default" : "outline"}
                  size="sm"
                  onClick={() => update("authMethod", "password")}
                >
                  Password
                </Button>
                <Button
                  type="button"
                  variant={form.authMethod === "key" ? "default" : "outline"}
                  size="sm"
                  onClick={() => update("authMethod", "key")}
                >
                  Private key
                </Button>
              </div>
            </div>

            {form.authMethod === "password" ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
                    <Label htmlFor="vault-key-pick" className="shrink-0">
                      From vault
                    </Label>
                    {vaultLoadState === "loading" && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mb-0.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </span>
                    )}
                  </div>
                  {vaultLoadState === "locked" && (
                    <p className="text-xs text-muted-foreground">
                      Unlock the vault to pick a saved key.{" "}
                      <Link
                        href="/dashboard/vault"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Open vault
                      </Link>
                    </p>
                  )}
                  {vaultLoadState === "error" && (
                    <p className="text-xs text-destructive">
                      Could not load vault secrets. Try again or paste the key
                      below.
                    </p>
                  )}
                  {vaultLoadState === "ready" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={selectedVaultId || "__none__"}
                        onValueChange={applyVaultSecret}
                        disabled={vaultSecretLoading}
                      >
                        <SelectTrigger
                          id="vault-key-pick"
                          className="w-full sm:max-w-md"
                          size="default"
                        >
                          <SelectValue placeholder="Choose a vault entry…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            None (paste manually)
                          </SelectItem>
                          {vaultMeta.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {`${s.name} · ${s.category.replace(/_/g, " ")}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {vaultSecretLoading && (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}
                  {vaultLoadState === "ready" && vaultMeta.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No secrets in the vault yet.{" "}
                      <Link
                        href="/dashboard/vault"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Add a secret
                      </Link>{" "}
                      or paste a PEM key below.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="privateKey">Private key (PEM)</Label>
                  <Textarea
                    id="privateKey"
                    value={form.privateKey}
                    onChange={(e) => {
                      setSelectedVaultId("");
                      update("privateKey", e.target.value);
                    }}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    className="font-mono text-xs min-h-[120px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passphrase">Passphrase (optional)</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={form.passphrase}
                    onChange={(e) => update("passphrase", e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save connection
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3 px-6 pb-4">
            Wiki ingest sends Supabase URL, anon key, and your saved refresh token
            to openclaw each run — configure the token under Dashboard → Settings → OpenClaw / wiki ingest.
            See <code className="rounded bg-muted px-1">openclaw/skills/supabase-reads/SKILL.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
