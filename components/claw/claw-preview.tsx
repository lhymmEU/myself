"use client";

import { useEffect, useState } from "react";
import { WifiOff, Shell } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface PreviewConnection {
  id: string;
  name: string;
  host: string;
}

export function ClawPreview() {
  const t = useT();
  const [connections, setConnections] = useState<PreviewConnection[]>([]);

  useEffect(() => {
    fetch("/api/claw/connections")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConnections(data);
      })
      .catch(() => {});
  }, []);

  if (connections.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <Shell className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("claw.preview.setupConnection")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold">{connections.length}</p>
        <p className="text-sm text-muted-foreground">
          {connections.length === 1 ? t("claw.preview.server") : t("claw.preview.servers")}{" "}{t("claw.preview.configured")}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <WifiOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t("claw.preview.clickToManage")}
        </span>
      </div>
    </div>
  );
}
