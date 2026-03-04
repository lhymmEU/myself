"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { LlmConfig } from "./llm-config";
import { FinanceDefaults } from "./finance-defaults";
import { AppearanceConfig } from "./appearance-config";
import { DataManagement } from "./data-management";
import { Loader2 } from "lucide-react";

export function SettingsForm() {
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
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

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
        toast.success("Setting saved");
      } catch {
        toast.error("Failed to save setting");
      }
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
      <FinanceDefaults settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <AppearanceConfig settings={settings} onUpdate={handleUpdate} />
      <Separator />
      <DataManagement />
    </div>
  );
}
