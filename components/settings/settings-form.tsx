"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { LlmConfig } from "./llm-config";
import { OpenBBConfig } from "./openbb-config";
import { FinanceProvidersConfig } from "./finance-providers-config";
import { FinanceDisplayConfig } from "./finance-display-config";
import { AppearanceConfig } from "./appearance-config";
import { InvoiceConfig } from "./invoice-config";
import { ClawAccessConfig } from "./claw-access-config";
import { DataManagement } from "./data-management";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function SettingsForm() {
  const t = useT();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error(t("settings.form.failedLoad"));
        setLoading(false);
      });
  }, [t]);

  const handleUpdate = useCallback(
    async (key: string, value: string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) throw new Error();
        toast.success(t("settings.form.settingSaved"));
      } catch {
        toast.error(t("settings.form.failedSave"));
      }
    },
    [t]
  );

  const handleUpdateSilent = useCallback(
    async (key: string, value: string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LlmConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <OpenBBConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <FinanceProvidersConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <FinanceDisplayConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <InvoiceConfig settings={settings} onUpdate={handleUpdateSilent} />
      <Separator />
      <AppearanceConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <ClawAccessConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <DataManagement />
    </div>
  );
}
