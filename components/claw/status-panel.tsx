"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Activity,
  Server,
  MessageSquare,
  Users,
  Loader2,
} from "lucide-react";

interface StatusPanelProps {
  connectionId: string | null;
  connected: boolean;
}

interface StatusData {
  raw: string;
  parsed: boolean;
  gatewayRunning?: boolean;
  error?: string;
}

interface HealthData {
  raw: string;
  healthy?: boolean;
  error?: string;
}

export function StatusPanel({ connectionId, connected }: StatusPanelProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const [statusRes, healthRes] = await Promise.all([
        fetch("/api/claw/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, command: "status" }),
        }),
        fetch("/api/claw/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, command: "health" }),
        }),
      ]);

      const statusData = await statusRes.json();
      const healthData = await healthRes.json();

      setStatus({
        raw: statusData.stdout || statusData.error || "",
        parsed: true,
        gatewayRunning: statusData.code === 0,
        error: statusData.error,
      });

      setHealth({
        raw: healthData.stdout || healthData.error || "",
        healthy: healthData.code === 0,
        error: healthData.error,
      });
    } catch (err) {
      setStatus({
        raw: "",
        parsed: false,
        error: err instanceof Error ? err.message : "Failed to fetch",
      });
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  useEffect(() => {
    if (connected) {
      refresh();
    } else {
      setStatus(null);
      setHealth(null);
    }
  }, [connected, refresh]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to view status</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Gateway Overview
        </h3>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Gateway
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.gatewayRunning ? (
              <Badge className="bg-emerald-600">Running</Badge>
            ) : status?.error ? (
              <Badge variant="destructive">Error</Badge>
            ) : (
              <Badge variant="secondary">Unknown</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.healthy ? (
              <Badge className="bg-emerald-600">Healthy</Badge>
            ) : health?.error ? (
              <Badge variant="destructive">Unhealthy</Badge>
            ) : (
              <Badge variant="secondary">Unknown</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {status ? "See details below" : "—"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {status?.raw && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              openclaw status --all
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-80 overflow-auto">
              {status.raw}
            </pre>
          </CardContent>
        </Card>
      )}

      {health?.raw && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              openclaw health --json
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-80 overflow-auto">
              {health.raw}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
