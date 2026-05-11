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
import { Copy, Loader2 } from "lucide-react";
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
  /** Empty = disabled. Remote listen port for reverse SSH → local Next (openclaw uses http://127.0.0.1:PORT/api/agent on server). */
  toolReverseForwardRemotePort: string;
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
  toolReverseForwardRemotePort: "",
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
    const trfRaw = form.toolReverseForwardRemotePort.trim();
    let toolReverseForwardRemotePort: number | undefined;
    if (trfRaw !== "") {
      const n = Number(trfRaw);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        setError("Remote tool tunnel port must be an integer 1–65535 or empty");
        return;
      }
      toolReverseForwardRemotePort = n;
    }
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
      ...(toolReverseForwardRemotePort !== undefined
        ? { toolReverseForwardRemotePort }
        : {}),
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

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="toolReverseForwardRemotePort">
                  Remote tool tunnel port (optional)
                </Label>
                <Input
                  id="toolReverseForwardRemotePort"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  placeholder="e.g. 30443 — leave empty to disable"
                  value={form.toolReverseForwardRemotePort}
                  onChange={(e) =>
                    update("toolReverseForwardRemotePort", e.target.value)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When set, this app requests a reverse SSH forward on{" "}
                <span className="font-mono">127.0.0.1</span> on the{" "}
                <strong>remote</strong> host so openclaw there can call your
                local Next server via HTTP. Point openclaw at the URL below
                (on the server). Requires{" "}
                <span className="font-mono">AllowTcpForwarding</span> on{" "}
                <span className="font-mono">sshd</span>.
              </p>
              {(() => {
                const t = form.toolReverseForwardRemotePort.trim();
                const n = Number(t);
                if (t === "" || !Number.isInteger(n) || n < 1 || n > 65535) {
                  return null;
                }
                const url = `http://127.0.0.1:${n}/api/agent`;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="max-w-full break-all rounded bg-background px-2 py-1 text-xs">
                      {url}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void navigator.clipboard.writeText(url)}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                );
              })()}
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
            Remote agents can read Postgres via the repo bundle{" "}
            <code className="rounded bg-muted px-1">openclaw/skills/supabase-reads/</code>{" "}
            (see <code className="rounded bg-muted px-1">SKILL.md</code>) using your
            Supabase anon key + user JWT — never the service role on the SSH host.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
