"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface PreviewStatus {
  initialized: boolean;
  unlocked: boolean;
  secretCount: number;
}

export function VaultPreview() {
  const t = useT();
  const [status, setStatus] = useState<PreviewStatus | null>(null);

  useEffect(() => {
    fetch("/api/vault?action=status")
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  if (!status || !status.initialized) {
    return (
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("vault.preview.setup")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold">{status.secretCount}</p>
        <p className="text-sm text-muted-foreground">
          {t("vault.preview.secretsSecured")}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {status.unlocked ? (
          <>
            <Unlock className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">{t("vault.preview.unlocked")}</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("vault.preview.locked")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
