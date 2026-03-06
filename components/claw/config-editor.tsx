"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  Save,
  Server,
  Loader2,
  FileJson,
  AlertTriangle,
  Code,
  FormInput,
} from "lucide-react";
import { CodeEditor } from "@/components/claw/code-editor";
import { JsonFormEditor } from "@/components/claw/json-form-editor";

type ViewMode = "code" | "form";

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
  const [viewMode, setViewMode] = useState<ViewMode>("form");
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const syncFormFromConfig = useCallback((jsonStr: string) => {
    try {
      setFormData(JSON.parse(jsonStr));
    } catch {
      // keep existing formData if JSON is invalid
    }
  }, []);

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
      syncFormFromConfig(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected, syncFormFromConfig]);

  const save = useCallback(async () => {
    if (!connectionId || !connected) return;
    setError(null);
    setSaved(false);

    const configToSave = viewMode === "form"
      ? JSON.stringify(formData, null, 2)
      : config;

    try {
      JSON.parse(configToSave);
    } catch {
      setError("Invalid JSON - fix syntax errors before saving");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/claw/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, config: configToSave }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        const formatted = JSON.stringify(JSON.parse(configToSave), null, 2);
        setConfig(formatted);
        setOriginalConfig(formatted);
        syncFormFromConfig(formatted);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [connectionId, connected, config, viewMode, formData, syncFormFromConfig]);

  useEffect(() => {
    if (connected) load();
    else {
      setConfig("");
      setOriginalConfig("");
      setFormData({});
      setError(null);
    }
  }, [connected, load]);

  const handleViewToggle = (mode: ViewMode) => {
    if (mode === "form" && viewMode === "code") {
      syncFormFromConfig(config);
    } else if (mode === "code" && viewMode === "form") {
      setConfig(JSON.stringify(formData, null, 2));
    }
    setViewMode(mode);
  };

  const hasChanges = viewMode === "form"
    ? JSON.stringify(formData, null, 2) !== originalConfig
    : config !== originalConfig;

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
      <div className="flex items-center gap-2 flex-wrap">
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
        {viewMode === "code" && (
          <Button size="sm" variant="outline" onClick={formatJson}>
            <FileJson className="h-3.5 w-3.5 mr-1.5" />
            Format
          </Button>
        )}
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

        <div className="ml-auto flex items-center border rounded-md overflow-hidden">
          <button
            className={`px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${
              viewMode === "form"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleViewToggle("form")}
          >
            <FormInput className="h-3 w-3" />
            Form
          </button>
          <button
            className={`px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${
              viewMode === "code"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleViewToggle("code")}
          >
            <Code className="h-3 w-3" />
            Code
          </button>
        </div>

        {hasChanges && (
          <span className="text-xs text-yellow-500">Unsaved changes</span>
        )}
        {saved && (
          <span className="text-xs text-emerald-500">Saved</span>
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
          {viewMode === "code" ? (
            <CodeEditor
              value={config}
              onChange={setConfig}
              language="json"
              minHeight="500px"
            />
          ) : (
            <div className="min-h-[500px] p-3 rounded-md border bg-muted/30">
              {Object.keys(formData).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Empty configuration. Switch to Code view to add raw JSON, or add fields below.
                </p>
              ) : null}
              <JsonFormEditor
                value={formData as Record<string, never>}
                onChange={(updated) => setFormData(updated)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
