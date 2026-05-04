"use client";

/**
 * Add Cloud-server (edge transport) dialog.
 *
 * Walks the user through adding an SSH-reachable cloud VM that the
 * dashboard will connect to via the browser-WASM SSH client + Cloudflare
 * Worker TCP bridge. Credentials are encrypted with the user's vault
 * master key in the browser; the server only ever stores ciphertext.
 *
 * Flow:
 *   1. If the vault is locked / not initialised, prompt for the master
 *      password and unlock it in-memory for this tab.
 *   2. Collect name, host, port, username, and auth method (password or
 *      SSH key — paste, upload `.pem`/`.key`, or pick from an existing
 *      vault secret).
 *   3. Encrypt the credential JSON blob with `createCloudSecret` →
 *      receive a `credentialSecretId`.
 *   4. POST `/api/claw/connections` with `transport: "edge"` and that
 *      `credentialSecretId`. The plaintext key never leaves the browser.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Loader2,
  Lock,
  Plus,
  Upload,
} from "lucide-react";
import {
  createCloudSecret,
  getCloudVaultStatus,
  isVaultClientUnlocked,
  setupCloudVault,
  unlockCloudVault,
} from "@/lib/modules/vault/client";
import {
  encodeEdgeCredential,
  inspectPemKey,
  normalizePem,
} from "@/lib/modules/claw/edge-credentials";

interface AddEdgeServerProps {
  onAdded?: () => void;
  triggerLabel?: string;
}

type AuthMethod = "password" | "key";
type Phase = "unlock" | "form" | "saving";

export function AddEdgeServer({
  onAdded,
  triggerLabel = "Add cloud server",
}: AddEdgeServerProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [vaultInitialised, setVaultInitialised] = useState<boolean | null>(
    null,
  );
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultPasswordConfirm, setVaultPasswordConfirm] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("key");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setName("");
    setHost("");
    setPort("22");
    setUsername("root");
    setAuthMethod("key");
    setPassword("");
    setPrivateKey("");
    setPassphrase("");
    setKeyFileName(null);
    setError(null);
    setVaultPassword("");
    setVaultPasswordConfirm("");
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getCloudVaultStatus();
        if (cancelled) return;
        setVaultInitialised(status.initialized);
        if (status.unlocked || isVaultClientUnlocked()) {
          setPhase("form");
        } else {
          setPhase("unlock");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to read vault");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleUnlock = async () => {
    setError(null);
    if (!vaultPassword) return;
    setUnlocking(true);
    try {
      if (vaultInitialised === false) {
        if (vaultPassword.length < 8) {
          setError("Master password must be at least 8 characters.");
          return;
        }
        if (vaultPassword !== vaultPasswordConfirm) {
          setError("Passwords do not match.");
          return;
        }
        await setupCloudVault(vaultPassword);
        setPhase("form");
        setVaultPassword("");
        setVaultPasswordConfirm("");
        return;
      }
      const ok = await unlockCloudVault(vaultPassword);
      if (!ok) {
        setError("Incorrect password.");
        return;
      }
      setPhase("form");
      setVaultPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock vault");
    } finally {
      setUnlocking(false);
    }
  };

  const handleKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      setPrivateKey(normalizePem(raw));
      setKeyFileName(file.name);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pemInfo =
    authMethod === "key" && privateKey.trim()
      ? inspectPemKey(privateKey)
      : null;

  const handleSave = async () => {
    setError(null);
    if (!name.trim() || !host.trim() || !username.trim()) {
      setError("Name, host, and username are required.");
      return;
    }
    const portNum = parseInt(port, 10);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setError("Port must be between 1 and 65535.");
      return;
    }
    if (authMethod === "password" && !password) {
      setError("Password is required for password auth.");
      return;
    }
    if (authMethod === "key" && !privateKey.trim()) {
      setError("Private key is required for key auth.");
      return;
    }

    setPhase("saving");
    try {
      const blob = encodeEdgeCredential(
        authMethod === "password"
          ? { authMethod: "password", password }
          : {
              authMethod: "key",
              privateKey,
              passphrase: passphrase || undefined,
            },
      );

      const meta = await createCloudSecret({
        name: `ssh:${name.trim()}`,
        category: "ssh_key",
        value: blob,
        tags: ["claw", "edge"],
      });

      const res = await fetch("/api/claw/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          authMethod,
          transport: "edge",
          credentialSecretId: meta.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Failed to save connection (HTTP ${res.status})`,
        );
      }

      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add server");
      setPhase("form");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Add cloud server
          </DialogTitle>
          <DialogDescription>
            Connect directly to a publicly reachable cloud VM via the
            browser SSH client. Credentials are encrypted with your vault
            master key — the server never sees them.
          </DialogDescription>
        </DialogHeader>

        {phase === "unlock" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {vaultInitialised === false
                  ? "Set vault master password"
                  : "Vault master password"}
              </Label>
              <Input
                type="password"
                placeholder={
                  vaultInitialised === false
                    ? "Choose a password (min 8 chars)"
                    : "Enter your vault password"
                }
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                autoFocus
              />
              {vaultInitialised === false && (
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={vaultPasswordConfirm}
                  onChange={(e) => setVaultPasswordConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                />
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2.5 py-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleUnlock}
              disabled={unlocking || !vaultPassword}
            >
              {unlocking ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5 mr-1.5" />
              )}
              {vaultInitialised === false ? "Create vault" : "Unlock vault"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="my-vps"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Host</Label>
                <Input
                  placeholder="example.com or 1.2.3.4"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  inputMode="numeric"
                  value={port}
                  onChange={(e) =>
                    setPort(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Auth method</Label>
                <Select
                  value={authMethod}
                  onValueChange={(v) => setAuthMethod(v as AuthMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="key">SSH key</SelectItem>
                    <SelectItem value="password">Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {authMethod === "password" ? (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Private key (PEM)</Label>
                    <div className="flex items-center gap-1.5">
                      {keyFileName && (
                        <span className="text-[11px] text-emerald-500">
                          {keyFileName}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Browse
                      </Button>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pem,.key,.txt,application/x-pem-file"
                    onChange={handleKeyFile}
                  />
                  <Textarea
                    className="font-mono text-xs"
                    rows={5}
                    placeholder="-----BEGIN RSA PRIVATE KEY----- or -----BEGIN OPENSSH PRIVATE KEY-----"
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setKeyFileName(null);
                    }}
                  />
                  {pemInfo && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {pemInfo.supported ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                      Detected: {pemInfo.label}
                      {pemInfo.encrypted && " · passphrase required"}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Accepts OpenSSH, PKCS#1 (RSA/EC/DSA `.pem`) and PKCS#8
                    keys. Encrypted keys require the passphrase below.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Passphrase (optional)</Label>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2.5 py-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={phase === "saving"}
            >
              {phase === "saving" && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              Save connection
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
