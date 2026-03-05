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
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface SoulEditorProps {
  connectionId: string | null;
  connected: boolean;
}

export function SoulEditor({ connectionId, connected }: SoulEditorProps) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
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
        `/api/claw/memory?connectionId=${encodeURIComponent(connectionId)}&action=read&file=${encodeURIComponent("SOUL.md")}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const text = data.content ?? "";
      setContent(text);
      setOriginalContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  const save = useCallback(async () => {
    if (!connectionId || !connected) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/claw/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          action: "write",
          file: "SOUL.md",
          content,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOriginalContent(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [connectionId, connected, content]);

  useEffect(() => {
    if (connected) load();
    else {
      setContent("");
      setOriginalContent("");
      setError(null);
    }
  }, [connected, load]);

  const hasChanges = content !== originalContent;

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to edit the soul</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Reload
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !hasChanges}>
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
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            ~/.openclaw/workspace/SOUL.md
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="font-mono text-xs min-h-[500px] resize-y bg-muted/30"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
