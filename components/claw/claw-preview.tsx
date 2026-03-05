"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Shell } from "lucide-react";

interface PreviewConnection {
  id: string;
  name: string;
  host: string;
}

export function ClawPreview() {
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
          Set up your OpenClaw connection
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold">{connections.length}</p>
        <p className="text-sm text-muted-foreground">
          {connections.length === 1 ? "server" : "servers"} configured
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <WifiOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Click to manage
        </span>
      </div>
    </div>
  );
}
