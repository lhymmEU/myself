"use client";

import { VaultManager } from "@/components/vault/vault-manager";
import { useT } from "@/lib/i18n/context";

export default function VaultPage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("vault.title")}</h1>
        <p className="text-muted-foreground">
          {t("vault.subtitle")}
        </p>
      </div>

      <VaultManager />
    </div>
  );
}
