"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  MessageSquare,
  Server,
  Loader2,
  Search,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ChannelsPanelProps {
  connectionId: string | null;
  connected: boolean;
}

export function ChannelsPanel({ connectionId, connected }: ChannelsPanelProps) {
  const t = useT();
  const [statusOutput, setStatusOutput] = useState("");
  const [listOutput, setListOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);

  const refresh = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    try {
      const statusRes = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, command: "channels-status" }),
      });
      const statusData = await statusRes.json();

      const listRes = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, command: "channels-list" }),
      });
      const listData = await listRes.json();

      setStatusOutput(statusData.stdout || statusData.stderr || statusData.error || "");
      setListOutput(listData.stdout || listData.stderr || listData.error || "");
    } catch (err) {
      setStatusOutput(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const deepProbe = useCallback(async () => {
    if (!connectionId || !connected) return;
    setProbing(true);
    try {
      const res = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          raw: "openclaw status --deep",
        }),
      });
      const data = await res.json();
      setStatusOutput(data.stdout || data.stderr || data.error || "");
    } finally {
      setProbing(false);
    }
  }, [connectionId, connected]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t("claw.channels.connectToManage")}</p>
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
          {t("common.refresh")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={deepProbe}
          disabled={probing}
        >
          {probing ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5 mr-1.5" />
          )}
          {t("claw.channels.deepProbe")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("claw.channels.channelStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusOutput ? (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-80 overflow-auto">
              {statusOutput}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>

      {listOutput && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("claw.channels.channelList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-80 overflow-auto">
              {listOutput}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          WhatsApp
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Telegram
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Discord
        </Badge>
        <Badge variant="secondary" className="text-xs">
          iMessage
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Slack
        </Badge>
        <span className="text-xs text-muted-foreground self-center ml-1">
          {t("claw.channels.supportedChannels")}
        </span>
      </div>
    </div>
  );
}
