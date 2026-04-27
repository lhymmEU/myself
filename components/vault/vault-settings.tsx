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
import { useT } from "@/lib/i18n/context";
import type { VaultStatus } from "@/lib/modules/vault/types";
import { isLocal } from "@/lib/core/runtime";
import {
  changeVaultPasswordUi,
  changeVaultStoragePathUi,
} from "@/lib/modules/vault/api";

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
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("vault.settings.dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {isLocal() && (
            <>
              <StoragePathSection
                currentPath={status.storagePath}
                onChanged={onStatusChange}
              />
              <Separator />
            </>
          )}
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
  const t = useT();
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
      await changeVaultStoragePathUi(newPath.trim());
      setSuccess(true);
      setNewPath("");
      onChanged();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("vault.settings.errorNetwork"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("vault.settings.storageLocation")}</h3>
      </div>
      <div className="rounded-md border bg-muted/30 p-2.5">
        <p className="text-xs font-mono text-muted-foreground break-all">
          {currentPath}
        </p>
      </div>
      <form onSubmit={handleChangePath} className="space-y-2">
        <Label htmlFor="new-path" className="text-xs">
          {t("vault.settings.newLocation")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="new-path"
            placeholder={t("vault.settings.placeholderPath")}
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
              t("vault.settings.move")
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
          {t("vault.settings.moveHelp")}
        </p>
      </form>
    </div>
  );
}

function ChangePasswordSection() {
  const t = useT();
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
      setError(t("vault.settings.errorMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("vault.settings.errorMismatch"));
      return;
    }

    setSubmitting(true);

    try {
      const ok = await changeVaultPasswordUi(currentPassword, newPassword);
      if (!ok) {
        setError(t("vault.settings.failedChangePassword"));
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("vault.settings.errorNetwork"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("vault.settings.changePassword")}</h3>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="current-pw" className="text-xs">
            {t("vault.settings.currentPassword")}
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
            {t("vault.settings.newPassword")}
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
            {t("vault.settings.confirmNewPassword")}
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
            {showPasswords ? t("vault.settings.hidePasswords") : t("vault.settings.showPasswords")}
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
            {t("vault.settings.passwordChanged")}
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
            t("vault.settings.changePasswordBtn")
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("vault.settings.changePasswordHelp")}
        </p>
      </form>
    </div>
  );
}
