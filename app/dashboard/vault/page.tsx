"use client";

import { VaultManager } from "@/components/vault/vault-manager";

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vault</h1>
        <p className="text-muted-foreground">
          Secure, encrypted storage for your secrets
        </p>
      </div>

      <VaultManager />
    </div>
  );
}
