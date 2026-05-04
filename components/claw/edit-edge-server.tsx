"use client";

/**
 * Edit cloud-server (edge transport) dialog.
 *
 * Mirrors `add-edge-server.tsx` but works on an existing connection row.
 * The user can:
 *   - rename the connection / change host, port, username
 *   - rotate the SSH credential (paste a new PEM, upload a `.pem` file, or
 *     swap to password auth)
 *
 * Credential rotation creates a fresh vault secret in the browser (so the
 * server never sees the new plaintext) and PUTs the new
 * `credentialSecretId` to `/api/claw/connections`. The old vault secret is
 * left in place — the user can prune it from the vault UI if they want.
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  createCloudSecret,
  getCloudVaultStatus,
  isVaultClientUnlocked,
  unlockCloudVault,
} from "@/lib/modules/vault/client";
import {
  encodeEdgeCredential,
  inspectPemKey,
  normalizePem,
} from "@/lib/modules/claw/edge-credentials";

interface EditableConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  transport: "ssh" | "relay" | "edge";
  credentialSecretId?: string;
}

interface EditEdgeServerProps {
  connection: EditableConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type AuthMethod = "password" | "key";
type Phase = "unlock" | "form" | "saving";

export function EditEdgeServer({
  connection,
  open,
  onOpenChange,
  onSaved,
}: EditEdgeServerProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [vaultPassword, setVaultPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(connection.name);
  const [host, setHost] = useState(connection.host);
  const [port, setPort] = useState(String(connection.port));
  const [username, setUsername] = useState(connection.username);

  // Credential rotation is opt-in: leave it untouched and we keep the
  // existing credentialSecretId. Flip it on to provide a new key/password.
  const [rotateCredential, setRotateCredential] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    connection.authMethod,
  );
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset local state whenever the dialog reopens against a possibly
  // different row.
  useEffect(() => {
    if (!open) return;
    setName(connection.name);
    setHost(connection.host);
    setPort(String(connection.port));
    setUsername(connection.username);
    setRotateCredential(false);
    setAuthMethod(connection.authMethod);
    setPassword("");
    setPrivateKey("");
    setPassphrase("");
    setKeyFileName(null);
    setError(null);
    setVaultPassword("");
    setPhase("form");
  }, [open, connection]);

  // If the user opts to rotate the credential we need the vault unlocked
  // because `createCloudSecret` requires the master key in memory. For
  // metadata-only edits the vault stays locked.
  useEffect(() => {
    if (!open || !rotateCredential) return;
    if (isVaultClientUnlocked()) {
      setPhase("form");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const status = await getCloudVaultStatus();
        if (cancelled) return;
        if (!status.initialized) {
          setError(
            "Vault is not initialised yet. Add a server first to set up the vault.",
          );
          setRotateCredential(false);
          return;
        }
        setPhase(status.unlocked ? "form" : "unlock");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to read vault");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, rotateCredential]);

  const handleUnlock = async () => {
    setError(null);
    if (!vaultPassword) return;
    setUnlocking(true);
    try {
      const ok = await unlockCloudVault(vaultPassword);
      if (!ok) {
        setError("Incorrect password.");
        return;
      }
      setVaultPassword("");
      setPhase("form");
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
      const text = String(reader.result ?? "");
      setPrivateKey(normalizePem(text));
      setKeyFileName(file.name);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pemInfo = privateKey.trim() ? inspectPemKey(privateKey) : null;

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

    let newCredentialSecretId: string | undefined;
    let nextAuthMethod: AuthMethod | undefined;

    if (rotateCredential) {
      if (authMethod === "password" && !password) {
        setError("Password is required when rotating to password auth.");
        return;
      }
      if (authMethod === "key" && !privateKey.trim()) {
        setError("Paste or upload a private key to rotate the credential.");
        return;
      }
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
        setPhase("saving");
        const meta = await createCloudSecret({
          name: `ssh:${name.trim()}`,
          category: "ssh_key",
          value: blob,
          tags: ["claw", "edge"],
        });
        newCredentialSecretId = meta.id;
        nextAuthMethod = authMethod;
      } catch (err) {
        setPhase("form");
        setError(
          err instanceof Error ? err.message : "Failed to encrypt credential",
        );
        return;
      }
    } else {
      setPhase("saving");
    }

    try {
      const res = await fetch("/api/claw/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: connection.id,
          name: name.trim(),
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          ...(nextAuthMethod ? { authMethod: nextAuthMethod } : {}),
          ...(newCredentialSecretId
            ? { credentialSecretId: newCredentialSecretId }
            : {}),
          // Keep the row's transport stable — we don't switch transports
          // from this dialog.
          transport: connection.transport,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Failed to update connection (HTTP ${res.status})`,
        );
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      setPhase("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit connection
          </DialogTitle>
          <DialogDescription>
            Update the host details, or rotate the SSH credential. New keys
            are encrypted with your vault password before leaving the
            browser.
          </DialogDescription>
        </DialogHeader>

        {phase === "unlock" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Vault master password
              </Label>
              <Input
                type="password"
                placeholder="Enter your vault password"
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                autoFocus
              />
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
              Unlock vault
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Host</Label>
                <Input
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
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="rounded-md border border-dashed p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={rotateCredential}
                  onChange={(e) => setRotateCredential(e.target.checked)}
                />
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                Replace SSH credential
              </label>
              <p className="text-[11px] text-muted-foreground">
                Tick this to swap in a new password or private key. Leave it
                off to keep the existing credential.
              </p>

              {rotateCredential && (
                <div className="space-y-3 pt-1">
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
                </div>
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
              onClick={handleSave}
              disabled={phase === "saving"}
            >
              {phase === "saving" && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
