"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Users,
  Server,
  Loader2,
  Trash2,
} from "lucide-react";

interface SessionsPanelProps {
  connectionId: string | null;
  connected: boolean;
}

interface SessionEntry {
  agentId?: string;
  key?: string;
  model?: string;
}

interface SessionsData {
  count?: number;
  sessions?: SessionEntry[];
  stores?: { agentId: string; path: string }[];
  raw: string;
}

export function SessionsPanel({ connectionId, connected }: SessionsPanelProps) {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const refresh = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, command: "sessions-list" }),
      });
      const result = await res.json();
      const raw = result.stdout || result.stderr || result.error || "";

      let parsed: SessionsData = { raw };
      try {
        const json = JSON.parse(raw);
        parsed = { ...json, raw };
      } catch {
        // keep raw
      }
      setData(parsed);
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const cleanup = useCallback(
    async (enforce: boolean) => {
      if (!connectionId || !connected) return;
      setCleaning(true);
      try {
        const res = await fetch("/api/claw/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            command: enforce ? "sessions-cleanup" : "sessions-cleanup-dry",
          }),
        });
        const result = await res.json();
        setCleanupResult(result.stdout || result.stderr || result.error || "");
        if (enforce) refresh();
      } finally {
        setCleaning(false);
      }
    },
    [connectionId, connected, refresh]
  );

  useEffect(() => {
    if (connected) refresh();
    else {
      setData(null);
      setCleanupResult(null);
    }
  }, [connected, refresh]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to manage sessions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Refresh
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => cleanup(false)}
          disabled={cleaning}
        >
          {cleaning ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Dry Run Cleanup
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => cleanup(true)}
          disabled={cleaning}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Enforce Cleanup
        </Button>
      </div>

      {data?.sessions && data.sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.sessions.map((s, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {s.agentId ?? "session"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {s.key && (
                  <p className="text-xs font-mono text-zinc-400 truncate">
                    {s.key}
                  </p>
                )}
                {s.model && (
                  <Badge variant="secondary" className="text-xs">
                    {s.model}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data?.count !== undefined && (
        <p className="text-sm text-muted-foreground">
          Total sessions: <span className="font-medium text-foreground">{data.count}</span>
        </p>
      )}

      {data?.raw && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Raw Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-60 overflow-auto">
              {data.raw}
            </pre>
          </CardContent>
        </Card>
      )}

      {cleanupResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cleanup Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-60 overflow-auto">
              {cleanupResult}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
