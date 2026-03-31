"use client";

import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function ConnectionBanner() {
  const t = useT();

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-destructive font-medium">
        <AlertTriangle className="size-4" />
        {t("finance.connection.title")}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("finance.connection.description")}
      </p>
      <div className="text-xs font-mono bg-muted rounded p-2 space-y-1">
        <div>pip install &quot;openbb[all]&quot;</div>
        <div>openbb-api --host 127.0.0.1 --port 6900</div>
      </div>
    </div>
  );
}
