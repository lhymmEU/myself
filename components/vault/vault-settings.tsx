"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Check,
  FolderOpen,
  KeyRound,
} from "lucide-react";
import type { VaultStatus } from "@/lib/modules/vault/types";

interface VaultSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: VaultStatus;
  onStatusChange: () => void;
}

export function VaultSettings({
  open,
  onOpenChange,
  status,
  onStatusChange,
}: VaultSettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vault Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <StoragePathSection
            currentPath={status.storagePath}
            onChanged={onStatusChange}
          />
          <Separator />
          <ChangePasswordSection />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StoragePathSection({
  currentPath,
  onChanged,
}: {
  currentPath: string;
  onChanged: () => void;
}) {
  const [newPath, setNewPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePath(e: React.FormEvent) {
    e.preventDefault();
    if (!newPath.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/vault?action=change-path", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath: newPath.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to change path");
        return;
      }

      setSuccess(true);
      setNewPath("");
      onChanged();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Storage Location</h3>
      </div>
      <div className="rounded-md border bg-muted/30 p-2.5">
        <p className="text-xs font-mono text-muted-foreground break-all">
          {currentPath}
        </p>
      </div>
      <form onSubmit={handleChangePath} className="space-y-2">
        <Label htmlFor="new-path" className="text-xs">
          New Location
        </Label>
        <div className="flex gap-2">
          <Input
            id="new-path"
            placeholder="/path/to/vault.db"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            className="font-mono text-xs flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newPath.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : success ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              "Move"
            )}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          The vault database will be copied to the new location.
        </p>
      </form>
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/vault?action=change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to change password");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Change Password</h3>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="current-pw" className="text-xs">
            Current Password
          </Label>
          <Input
            id="current-pw"
            type={showPasswords ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-pw" className="text-xs">
            New Password
          </Label>
          <Input
            id="new-pw"
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-pw" className="text-xs">
            Confirm New Password
          </Label>
          <Input
            id="confirm-pw"
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? (
              <EyeOff className="h-3 w-3 mr-1" />
            ) : (
              <Eye className="h-3 w-3 mr-1" />
            )}
            {showPasswords ? "Hide" : "Show"} passwords
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-500 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Password changed. All secrets re-encrypted.
          </p>
        )}
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            submitting
          }
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Change Password"
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          All secrets will be re-encrypted with the new password.
        </p>
      </form>
    </div>
  );
}
