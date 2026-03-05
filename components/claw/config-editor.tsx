"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Save,
  Server,
  Loader2,
  FileJson,
  AlertTriangle,
} from "lucide-react";

interface ConfigEditorProps {
  connectionId: string | null;
  connected: boolean;
}

export function ConfigEditor({ connectionId, connected }: ConfigEditorProps) {
  const [config, setConfig] = useState("");
  const [originalConfig, setOriginalConfig] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/claw/config?connectionId=${encodeURIComponent(connectionId)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      let formatted = data.config;
      try {
        formatted = JSON.stringify(JSON.parse(data.config), null, 2);
      } catch {
        // keep as-is
      }
      setConfig(formatted);
      setOriginalConfig(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const save = useCallback(async () => {
    if (!connectionId || !connected) return;
    setError(null);
    setSaved(false);

    try {
      JSON.parse(config);
    } catch {
      setError("Invalid JSON - fix syntax errors before saving");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/claw/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, config }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOriginalConfig(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [connectionId, connected, config]);

  useEffect(() => {
    if (connected) load();
    else {
      setConfig("");
      setOriginalConfig("");
      setError(null);
    }
  }, [connected, load]);

  const hasChanges = config !== originalConfig;

  const formatJson = () => {
    try {
      const parsed = JSON.parse(config);
      setConfig(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError("Cannot format: invalid JSON");
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to edit configuration</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Reload
        </Button>
        <Button size="sm" variant="outline" onClick={formatJson}>
          <FileJson className="h-3.5 w-3.5 mr-1.5" />
          Format
        </Button>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save
        </Button>
        {hasChanges && (
          <span className="text-xs text-yellow-500 ml-2">Unsaved changes</span>
        )}
        {saved && (
          <span className="text-xs text-emerald-500 ml-2">Saved</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            ~/.openclaw/openclaw.json
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="font-mono text-xs min-h-[500px] resize-y bg-muted/30"
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
