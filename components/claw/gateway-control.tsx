"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  RotateCcw,
  Download,
  Trash2,
  Server,
  Loader2,
  RefreshCw,
  Activity,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface GatewayControlProps {
  connectionId: string | null;
  connected: boolean;
}

export function GatewayControl({ connectionId, connected }: GatewayControlProps) {
  const t = useT();
  const [statusOutput, setStatusOutput] = useState("");
  const [actionOutput, setActionOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, command: "gateway-status" }),
      });
      const data = await res.json();
      setStatusOutput(data.stdout || data.stderr || data.error || "");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const doAction = useCallback(
    async (command: string, label: string) => {
      if (!connectionId || !connected) return;
      setActing(label);
      setActionOutput("");
      try {
        const res = await fetch("/api/claw/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, command }),
        });
        const data = await res.json();
        setActionOutput(
          `[${label}]\n${data.stdout || ""}${data.stderr ? `\nSTDERR: ${data.stderr}` : ""}${data.error ? `\nERROR: ${data.error}` : ""}\nExit code: ${data.code ?? "N/A"}`
        );
        refreshStatus();
      } finally {
        setActing(null);
      }
    },
    [connectionId, connected, refreshStatus]
  );

  useEffect(() => {
    if (connected) refreshStatus();
    else {
      setStatusOutput("");
      setActionOutput("");
    }
  }, [connected, refreshStatus]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t("claw.gateway.connectToControl")}</p>
      </div>
    );
  }

  const actions = [
    { command: "gateway-start", label: t("claw.gateway.start"), icon: Play, variant: "default" as const },
    { command: "gateway-stop", label: t("claw.gateway.stop"), icon: Square, variant: "outline" as const },
    { command: "gateway-restart", label: t("claw.gateway.restart"), icon: RotateCcw, variant: "outline" as const },
    { command: "gateway-install", label: t("claw.gateway.installDaemon"), icon: Download, variant: "outline" as const },
    { command: "gateway-uninstall", label: t("claw.gateway.uninstallDaemon"), icon: Trash2, variant: "destructive" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={refreshStatus}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {t("claw.gateway.refreshStatus")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {t("claw.gateway.serviceStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusOutput ? (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-60 overflow-auto">
              {statusOutput}
            </pre>
          ) : (
            <Badge variant="secondary">{t("common.loading")}</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {t("claw.gateway.gatewayActions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.command}
                size="sm"
                variant={a.variant}
                onClick={() => doAction(a.command, a.label)}
                disabled={acting !== null}
              >
                {acting === a.label ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <a.icon className="h-3.5 w-3.5 mr-1.5" />
                )}
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {actionOutput && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("claw.gateway.actionOutput")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-60 overflow-auto">
              {actionOutput}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
