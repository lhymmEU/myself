"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Plus,
  Plug,
  Unplug,
  Loader2,
  Server,
  Vault,
  KeyRound,
  FileKey,
  StickyNote,
  Award,
  Terminal,
  Wallet,
  HelpCircle,
  ChevronLeft,
  AlertCircle,
  Lock,
  Check,
  Upload,
  FileCheck,
  FolderOpen,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { VaultSecretMeta, SecretCategory } from "@/lib/modules/vault/types";

const CATEGORY_ICONS: Record<SecretCategory, typeof KeyRound> = {
  password: KeyRound,
  api_key: FileKey,
  credential: KeyRound,
  note: StickyNote,
  certificate: Award,
  ssh_key: Terminal,
  crypto_wallet: Wallet,
  other: HelpCircle,
};

interface ConnectionInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  gatewayPort: number;
  isDefault: boolean;
}

interface ConnectState {
  connected: boolean;
  connectionId: string | null;
  host?: string;
  username?: string;
}

interface ConnectionFormProps {
  onConnectionChange: (state: ConnectState) => void;
}

export function ConnectionForm({ onConnectionChange }: ConnectionFormProps) {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [connectState, setConnectState] = useState<ConnectState>({
    connected: false,
    connectionId: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: "22",
    username: "root",
    authMethod: "key" as "password" | "key",
    password: "",
    privateKey: "",
    passphrase: "",
    gatewayPort: "18789",
  });

  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const [keyPathInput, setKeyPathInput] = useState("");
  const [showKeyPathInput, setShowKeyPathInput] = useState(false);
  const [loadingKeyPath, setLoadingKeyPath] = useState(false);
  const [keyPathError, setKeyPathError] = useState<string | null>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((p) => ({ ...p, privateKey: reader.result as string }));
      setKeyFileName(file.name);
    };
    reader.readAsText(file);
    if (keyFileInputRef.current) keyFileInputRef.current.value = "";
  }, []);

  const handleLoadKeyFromPath = useCallback(async () => {
    if (!keyPathInput.trim()) return;
    setLoadingKeyPath(true);
    setKeyPathError(null);
    try {
      const res = await fetch("/api/claw/read-local-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: keyPathInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyPathError(data.error ?? "Failed to read file");
        return;
      }
      setFormData((p) => ({ ...p, privateKey: data.contents }));
      setKeyFileName(data.fileName);
      setShowKeyPathInput(false);
      setKeyPathInput("");
    } catch {
      setKeyPathError("Failed to load file");
    } finally {
      setLoadingKeyPath(false);
    }
  }, [keyPathInput]);

  // Vault picker state
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [vaultPickerTarget, setVaultPickerTarget] = useState<"password" | "privateKey">("privateKey");
  const [vaultLocked, setVaultLocked] = useState(true);
  const [vaultUnlockPassword, setVaultUnlockPassword] = useState("");
  const [vaultUnlocking, setVaultUnlocking] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSecrets, setVaultSecrets] = useState<VaultSecretMeta[]>([]);
  const [vaultLoadingSecrets, setVaultLoadingSecrets] = useState(false);
  const [vaultImporting, setVaultImporting] = useState<string | null>(null);
  const [vaultImported, setVaultImported] = useState<string | null>(null);

  const fetchVaultSecrets = useCallback(async () => {
    setVaultLoadingSecrets(true);
    try {
      const res = await fetch("/api/vault");
      if (res.status === 403) {
        setVaultLocked(true);
        setVaultSecrets([]);
        return;
      }
      if (res.ok) {
        setVaultSecrets(await res.json());
        setVaultLocked(false);
      }
    } catch {
      setVaultError("Failed to load vault secrets");
    } finally {
      setVaultLoadingSecrets(false);
    }
  }, []);

  const openVaultPicker = useCallback(async (target: "password" | "privateKey") => {
    setVaultPickerTarget(target);
    setVaultError(null);
    setVaultUnlockPassword("");
    setVaultImported(null);
    setVaultPickerOpen(true);

    const statusRes = await fetch("/api/vault?action=status");
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status.unlocked) {
        setVaultLocked(false);
        fetchVaultSecrets();
      } else {
        setVaultLocked(true);
      }
    }
  }, [fetchVaultSecrets]);

  const handleVaultUnlock = useCallback(async () => {
    if (!vaultUnlockPassword) return;
    setVaultUnlocking(true);
    setVaultError(null);
    try {
      const res = await fetch("/api/vault?action=unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: vaultUnlockPassword }),
      });
      if (!res.ok) {
        setVaultError("Incorrect password");
        return;
      }
      setVaultLocked(false);
      setVaultUnlockPassword("");
      fetchVaultSecrets();
    } catch {
      setVaultError("Failed to unlock vault");
    } finally {
      setVaultUnlocking(false);
    }
  }, [vaultUnlockPassword, fetchVaultSecrets]);

  const handleVaultSelectSecret = useCallback(async (id: string) => {
    setVaultImporting(id);
    setVaultError(null);
    try {
      const res = await fetch(`/api/vault?id=${id}`);
      if (!res.ok) {
        setVaultError("Failed to fetch secret");
        return;
      }
      const secret = await res.json();
      setFormData((p) => ({ ...p, [vaultPickerTarget]: secret.value }));
      setVaultImported(id);
      setTimeout(() => {
        setVaultPickerOpen(false);
        setVaultImported(null);
      }, 600);
    } catch {
      setVaultError("Failed to import secret");
    } finally {
      setVaultImporting(null);
    }
  }, [vaultPickerTarget]);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/claw/connections");
      const data = await res.json();
      if (Array.isArray(data)) setConnections(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnect = async (id: string) => {
    setConnecting(true);
    try {
      const res = await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      const data = await res.json();
      const state: ConnectState = {
        connected: data.connected,
        connectionId: data.connected ? id : null,
        host: data.host,
        username: data.username,
      };
      setConnectState(state);
      onConnectionChange(state);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (connectState.connectionId) {
      await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: connectState.connectionId,
          action: "disconnect",
        }),
      });
    }
    const state: ConnectState = { connected: false, connectionId: null };
    setConnectState(state);
    onConnectionChange(state);
  };

  const handleAddConnection = async () => {
    try {
      await fetch("/api/claw/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          host: formData.host,
          port: parseInt(formData.port),
          username: formData.username,
          authMethod: formData.authMethod,
          password: formData.authMethod === "password" ? formData.password : undefined,
          privateKey: formData.authMethod === "key" ? formData.privateKey : undefined,
          passphrase: formData.passphrase || undefined,
          gatewayPort: parseInt(formData.gatewayPort),
        }),
      });
      setAddOpen(false);
      setFormData({
        name: "",
        host: "",
        port: "22",
        username: "root",
        authMethod: "key",
        password: "",
        privateKey: "",
        passphrase: "",
        gatewayPort: "18789",
      });
      loadConnections();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/claw/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (connectState.connectionId === id) {
      handleDisconnect();
    }
    loadConnections();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SSH Connection
          </div>
          <div className="flex items-center gap-2">
            {connectState.connected ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                <Wifi className="h-3 w-3 mr-1" />
                {connectState.username}@{connectState.host}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-1">
              <Button
                size="sm"
                variant={
                  connectState.connectionId === conn.id ? "default" : "outline"
                }
                onClick={() =>
                  connectState.connectionId === conn.id
                    ? handleDisconnect()
                    : handleConnect(conn.id)
                }
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : connectState.connectionId === conn.id ? (
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Plug className="h-3.5 w-3.5 mr-1.5" />
                )}
                {conn.name}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(conn.id)}
              >
                &times;
              </Button>
            </div>
          ))}

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add SSH Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="My Cloud Server"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Host</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={formData.host}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, host: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      value={formData.port}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, port: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, username: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Method</Label>
                    <Select
                      value={formData.authMethod}
                      onValueChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          authMethod: v as "password" | "key",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">SSH Key</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.authMethod === "password" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => openVaultPicker("password")}
                      >
                        <Vault className="h-3 w-3 mr-1" />
                        From Vault
                      </Button>
                    </div>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Private Key (PEM)</Label>
                        <div className="flex items-center gap-1.5">
                          {keyFileName && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                              <FileCheck className="h-3 w-3" />
                              {keyFileName}
                            </span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => keyFileInputRef.current?.click()}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Browse
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={showKeyPathInput ? "secondary" : "outline"}
                            className="h-6 px-2 text-[11px]"
                            onClick={() => { setShowKeyPathInput(!showKeyPathInput); setKeyPathError(null); }}
                          >
                            <FolderOpen className="h-3 w-3 mr-1" />
                            From Path
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => openVaultPicker("privateKey")}
                          >
                            <Vault className="h-3 w-3 mr-1" />
                            From Vault
                          </Button>
                        </div>
                      </div>
                      <input
                        ref={keyFileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pem,.key,.pub,*"
                        onChange={handleKeyFileUpload}
                      />
                      {showKeyPathInput && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <Input
                              className="font-mono text-xs h-8"
                              placeholder="~/.ssh/id_ed25519"
                              value={keyPathInput}
                              onChange={(e) => { setKeyPathInput(e.target.value); setKeyPathError(null); }}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLoadKeyFromPath())}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3 shrink-0"
                              disabled={!keyPathInput.trim() || loadingKeyPath}
                              onClick={handleLoadKeyFromPath}
                            >
                              {loadingKeyPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load"}
                            </Button>
                          </div>
                          {keyPathError && (
                            <p className="text-[11px] text-red-400">{keyPathError}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            Enter an absolute path or use ~ for home. Tip: press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Cmd+Shift+.</kbd> in the Browse dialog to show hidden files.
                          </p>
                        </div>
                      )}
                      <Textarea
                        className="font-mono text-xs"
                        rows={5}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                        value={formData.privateKey}
                        onChange={(e) => {
                          setFormData((p) => ({
                            ...p,
                            privateKey: e.target.value,
                          }));
                          setKeyFileName(null);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Passphrase (optional)</Label>
                      <Input
                        type="password"
                        value={formData.passphrase}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            passphrase: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Gateway Port</Label>
                  <Input
                    value={formData.gatewayPort}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, gatewayPort: e.target.value }))
                    }
                  />
                </div>
                <Button className="w-full" onClick={handleAddConnection}>
                  Add Connection
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Vault Picker Dialog */}
          <Dialog open={vaultPickerOpen} onOpenChange={(open) => {
            setVaultPickerOpen(open);
            if (!open) {
              setVaultError(null);
              setVaultUnlockPassword("");
            }
          }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Vault className="h-4 w-4" />
                  Import from Vault
                </DialogTitle>
                <DialogDescription>
                  {vaultLocked
                    ? "Enter your vault password to decrypt and select a secret."
                    : `Select a secret to use as ${vaultPickerTarget === "privateKey" ? "the private key" : "the password"}.`}
                </DialogDescription>
              </DialogHeader>

              {vaultLocked ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      Vault Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Enter encryption password"
                      value={vaultUnlockPassword}
                      onChange={(e) => setVaultUnlockPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVaultUnlock()}
                      autoFocus
                    />
                  </div>
                  {vaultError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2.5 py-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {vaultError}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleVaultUnlock}
                    disabled={vaultUnlocking || !vaultUnlockPassword}
                  >
                    {vaultUnlocking ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Unlock Vault
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {vaultLoadingSecrets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : vaultSecrets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No secrets found in vault.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {vaultSecrets.map((secret) => {
                        const Icon = CATEGORY_ICONS[secret.category] ?? HelpCircle;
                        const isImporting = vaultImporting === secret.id;
                        const isImported = vaultImported === secret.id;
                        return (
                          <button
                            key={secret.id}
                            className="w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/60 transition-colors disabled:opacity-50"
                            onClick={() => handleVaultSelectSecret(secret.id)}
                            disabled={!!vaultImporting}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                              {isImported ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : isImporting ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{secret.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{secret.category.replace("_", " ")}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {vaultError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2.5 py-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {vaultError}
                    </div>
                  )}
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => { setVaultLocked(true); setVaultError(null); }}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Use a different password
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
