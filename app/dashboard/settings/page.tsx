"use client";

import { SettingsForm } from "@/components/settings/settings-form";
import { useT } from "@/lib/i18n/context";

export default function SettingsPage() {
  const t = useT();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>
      <SettingsForm />
    </div>
  );
}
