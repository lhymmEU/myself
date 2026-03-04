"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  Search,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Loader2,
  ShieldCheck,
  KeyRound,
  FileKey,
  StickyNote,
  Award,
  Terminal,
  Wallet,
  HelpCircle,
  Settings,
  Check,
} from "lucide-react";
import { AddSecret } from "./add-secret";
import { VaultSettings } from "./vault-settings";
import { SECRET_CATEGORIES } from "@/lib/modules/vault/types";
import type {
  VaultSecretMeta,
  VaultSecretWithValue,
  VaultStatus,
  SecretCategory,
} from "@/lib/modules/vault/types";

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

interface SecretListProps {
  status: VaultStatus;
  onStatusChange: () => void;
}

export function SecretList({ status, onStatusChange }: SecretListProps) {
  const [secrets, setSecrets] = useState<VaultSecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedSecret, setSelectedSecret] =
    useState<VaultSecretWithValue | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSecrets = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        setSecrets(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  async function handleLock() {
    await fetch("/api/vault?action=lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    onStatusChange();
  }

  async function handleViewSecret(id: string) {
    setDetailLoading(true);
    setDetailOpen(true);
    setShowValue(false);
    setShowNotes(false);
    setCopied(false);

    try {
      const res = await fetch(`/api/vault?id=${id}`);
      if (res.ok) {
        setSelectedSecret(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setSecrets((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/vault?id=${id}`, { method: "DELETE" });
    setDetailOpen(false);
    setSelectedSecret(null);
    fetchSecrets();
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const filtered = secrets.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      filterCategory === "all" || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const usedCategories = [
    ...new Set(secrets.map((s) => s.category)),
  ] as SecretCategory[];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search secrets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <AddSecret onCreated={fetchSecrets} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLock}>
              <Lock className="h-4 w-4 mr-1" />
              Lock
            </Button>
          </div>
        </div>

        {usedCategories.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={filterCategory === "all" ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => setFilterCategory("all")}
            >
              All ({secrets.length})
            </Button>
            {usedCategories.map((cat) => {
              const label = SECRET_CATEGORIES.find(
                (c) => c.value === cat
              )?.label;
              const count = secrets.filter((s) => s.category === cat).length;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={filterCategory === cat ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setFilterCategory(cat)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {secrets.length === 0
                ? "Your vault is empty. Add your first secret to get started."
                : "No secrets match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((secret) => {
              const Icon = CATEGORY_ICONS[secret.category] ?? HelpCircle;
              const catLabel = SECRET_CATEGORIES.find(
                (c) => c.value === secret.category
              )?.label;
              const ago = getTimeAgo(secret.updatedAt);

              return (
                <div
                  key={secret.id}
                  className="group flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleViewSecret(secret.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {secret.name}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {catLabel}
                      </Badge>
                    </div>
                    {secret.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {secret.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {secret.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{secret.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {ago}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSecret && (
                <>
                  {(() => {
                    const Icon =
                      CATEGORY_ICONS[selectedSecret.category] ?? HelpCircle;
                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                  {selectedSecret.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedSecret ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {SECRET_CATEGORIES.find(
                    (c) => c.value === selectedSecret.category
                  )?.label}
                </Badge>
                {selectedSecret.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Value</label>
                <div className="flex items-start gap-2">
                  <div className="flex-1 rounded-md border bg-muted/30 p-3 font-mono text-sm break-all min-h-[44px]">
                    {showValue
                      ? selectedSecret.value
                      : "•".repeat(Math.min(selectedSecret.value.length, 32))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setShowValue(!showValue)}
                    >
                      {showValue ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => handleCopy(selectedSecret.value)}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {selectedSecret.notes && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    {showNotes
                      ? selectedSecret.notes
                      : "•".repeat(
                          Math.min(selectedSecret.notes.length, 24)
                        )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    {showNotes ? (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hide notes
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Show notes
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Created {new Date(selectedSecret.createdAt).toLocaleDateString()}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selectedSecret.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <VaultSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        status={status}
        onStatusChange={onStatusChange}
      />
    </>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
