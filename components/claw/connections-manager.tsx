"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectionSetup } from "@/components/claw/connection-setup";
import { cn } from "@/lib/utils";

export interface ClawConnectionSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Props {
  connections: ClawConnectionSummary[];
  activeId: string | null;
  onActiveChange: (id: string) => void;
  onMutate: () => Promise<unknown>;
}

export function ConnectionsManager({
  connections,
  activeId,
  onActiveChange,
  onMutate,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClawConnectionSummary | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setDefault(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/claw/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Failed to update");
        return;
      }
      await onMutate();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    const confirmed = window.confirm(
      `Remove connection "${name}"? The remote agent is unaffected.`,
    );
    if (!confirmed) return;
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/claw/connections?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Failed to delete");
        return;
      }
      await onMutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-1 border-b px-4 pb-4 pr-12 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                SSH connections
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose which connection the chat uses. Set a default for new
                sessions.
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add connection
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {connections.map((c) => {
            const isActive = activeId === c.id;
            const rowBusy = busyId === c.id;
            const endpoint = `${c.username}@${c.host}:${c.port}`;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
                  isActive && "border-primary/50 bg-accent/30",
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {c.authMethod === "key" ? "SSH key" : "Password"}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {endpoint}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    disabled={rowBusy || isActive}
                    onClick={() => onActiveChange(c.id)}
                  >
                    Use for chat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={rowBusy || c.isDefault}
                    title="Make default"
                    onClick={() => setDefault(c.id)}
                  >
                    {rowBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={rowBusy}
                    onClick={() => setEditTarget(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={rowBusy}
                    onClick={() => remove(c.id, c.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-h-[min(90vh,800px)] overflow-y-auto p-0 sm:max-w-xl"
          showCloseButton
        >
          <ConnectionSetup
            onCreated={async () => {
              setAddOpen(false);
              await onMutate();
            }}
          />
        </DialogContent>
      </Dialog>

      <EditConnectionDialog
        connection={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={onMutate}
      />
    </>
  );
}

function EditConnectionDialog({
  connection,
  open,
  onOpenChange,
  onSaved,
}: {
  connection: ClawConnectionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) return;
    setName(connection.name);
    setHost(connection.host);
    setPort(String(connection.port));
    setUsername(connection.username);
    setError(null);
  }, [connection]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!connection) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/claw/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: connection.id,
          name: name.trim(),
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Update failed");
        return;
      }
      await onSaved();
      onOpenChange(false);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit connection</DialogTitle>
            <DialogDescription>
              Update label and endpoint. To change password or SSH key, remove this connection and add it again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-host">Host</Label>
              <Input
                id="edit-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit-user">Username</Label>
                <Input
                  id="edit-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  inputMode="numeric"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
