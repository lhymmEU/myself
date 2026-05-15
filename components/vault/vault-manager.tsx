"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { SecretList } from "./secret-list";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";
import type { VaultStatus } from "@/lib/modules/vault/types";
import {
  fetchVaultStatus,
  setupVaultUi,
  unlockVaultUi,
  subscribeVaultClient,
} from "@/lib/modules/vault/api";

export function VaultManager() {
  const t = useT();
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setStatus(await fetchVaultStatus());
    } catch {
      setError(t("vault.manager.failedConnect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStatus();
    return subscribeVaultClient(() => {
      fetchStatus();
    });
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!status?.initialized) {
    return <SetupForm onComplete={fetchStatus} />;
  }

  if (!status.unlocked) {
    return <UnlockForm onComplete={fetchStatus} />;
  }

  return <SecretList status={status} onStatusChange={fetchStatus} />;
}

function SetupForm({ onComplete }: { onComplete: () => void }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("vault.manager.errorMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("vault.manager.errorMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await setupVaultUi(password);
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("vault.manager.errorSetupFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("vault.manager.setupTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("vault.manager.setupDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-password">{t("vault.manager.masterPassword")}</Label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("vault.manager.placeholderPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.level
                            ? passwordStrength.color
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(passwordStrength.label as TranslationKey)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup-confirm">{t("vault.manager.confirmPassword")}</Label>
              <Input
                id="setup-confirm"
                type={showPassword ? "text" : "password"}
                placeholder={t("vault.manager.placeholderConfirm")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                !password || !confirm || password !== confirm || submitting
              }
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("vault.manager.createVault")
              )}
            </Button>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">{t("vault.manager.encryptionDetails")}</p>
              <p className="text-xs text-muted-foreground">
                {t("vault.manager.encryptionDesc")}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function UnlockForm({ onComplete }: { onComplete: () => void }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const ok = await unlockVaultUi(password);
      if (!ok) {
        setError(t("vault.manager.errorUnlock"));
        return;
      }
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("vault.manager.errorNetwork"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{t("vault.manager.unlockTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("vault.manager.unlockDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password">{t("vault.manager.masterPassword")}</Label>
              <div className="relative">
                <Input
                  id="unlock-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("vault.manager.placeholderUnlock")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!password || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("vault.manager.unlockButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
} {
  if (!password) return { level: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "vault.manager.passwordWeak", color: "bg-red-500" };
  if (score <= 2) return { level: 2, label: "vault.manager.passwordFair", color: "bg-orange-500" };
  if (score <= 3) return { level: 3, label: "vault.manager.passwordGood", color: "bg-yellow-500" };
  return { level: 4, label: "vault.manager.passwordStrong", color: "bg-emerald-500" };
}
