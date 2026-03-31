"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface OpenBBConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function OpenBBConfig({ settings, onUpdate }: OpenBBConfigProps) {
  const t = useT();
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  const testConnection = async () => {
    setTesting(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/finance/openbb?endpoint=__health");
      const data = await res.json();
      setStatus(data.connected ? "ok" : "fail");
    } catch {
      setStatus("fail");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5" />
          {t("settings.openbb.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="openbb-url">{t("settings.openbb.apiUrl")}</Label>
          <Input
            id="openbb-url"
            value={settings.openbb_api_url ?? "http://localhost:6900"}
            onChange={(e) => onUpdate("openbb_api_url", e.target.value)}
            placeholder="http://localhost:6900"
          />
          <p className="text-xs text-muted-foreground">
            {t("settings.openbb.apiUrlHelp")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={testing}
          >
            {testing && <Loader2 className="size-4 mr-2 animate-spin" />}
            {t("settings.openbb.testConnection")}
          </Button>
          {status === "ok" && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              {t("settings.openbb.connected")}
            </span>
          )}
          {status === "fail" && (
            <span className="flex items-center gap-1 text-sm text-destructive">
              <XCircle className="size-4" />
              {t("settings.openbb.disconnected")}
            </span>
          )}
        </div>

        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">{t("settings.openbb.setupTitle")}</p>
          <code className="block bg-background rounded px-2 py-1 mt-1">
            pip install &quot;openbb[all]&quot;
          </code>
          <code className="block bg-background rounded px-2 py-1">
            openbb-api --host 127.0.0.1 --port 6900
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
