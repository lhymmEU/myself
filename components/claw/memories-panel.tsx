"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Save,
  Search,
  Server,
  Loader2,
  Brain,
  Calendar,
  FileText,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { MemoryFile } from "@/lib/modules/claw/types";

interface MemoriesPanelProps {
  connectionId: string | null;
  connected: boolean;
}

type View = "list" | "edit-memory" | "view-daily" | "search" | "status";

export function MemoriesPanel({ connectionId, connected }: MemoriesPanelProps) {
  const [view, setView] = useState<View>("list");
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [hasMemoryMd, setHasMemoryMd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState("");
  const [searching, setSearching] = useState(false);

  const [memoryStatus, setMemoryStatus] = useState("");

  const loadFiles = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/claw/memory?connectionId=${encodeURIComponent(connectionId)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setFiles(data.files ?? []);
      setHasMemoryMd(data.hasMemoryMd ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [connectionId, connected]);

  useEffect(() => {
    if (connected) loadFiles();
    else {
      setFiles([]);
      setContent("");
      setOriginalContent("");
      setView("list");
      setError(null);
    }
  }, [connected, loadFiles]);

  const loadFile = useCallback(
    async (filePath: string) => {
      if (!connectionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/claw/memory?connectionId=${encodeURIComponent(connectionId)}&action=read&file=${encodeURIComponent(filePath)}`
        );
        const data = await res.json();
        setContent(data.content ?? "");
        setOriginalContent(data.content ?? "");
        setActiveFile(filePath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    },
    [connectionId]
  );

  const saveFile = useCallback(async () => {
    if (!connectionId || !activeFile) return;
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
          file: activeFile,
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
  }, [connectionId, activeFile, content]);

  const handleSearch = useCallback(async () => {
    if (!connectionId || !searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/claw/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          action: "search",
          query: searchQuery,
        }),
      });
      const data = await res.json();
      setSearchResults(data.results ?? data.error ?? "No results");
    } catch (err) {
      setSearchResults(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [connectionId, searchQuery]);

  const loadStatus = useCallback(async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claw/memory?connectionId=${encodeURIComponent(connectionId)}&action=status`
      );
      const data = await res.json();
      setMemoryStatus(data.status ?? data.error ?? "");
    } catch (err) {
      setMemoryStatus(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to manage memories</p>
      </div>
    );
  }

  const hasChanges = content !== originalContent;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => {
            setView("list");
            loadFiles();
          }}
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          Daily Logs
        </Button>
        <Button
          size="sm"
          variant={view === "edit-memory" ? "default" : "outline"}
          onClick={() => {
            setView("edit-memory");
            loadFile("MEMORY.md");
          }}
        >
          <Brain className="h-3.5 w-3.5 mr-1.5" />
          MEMORY.md
        </Button>
        <Button
          size="sm"
          variant={view === "search" ? "default" : "outline"}
          onClick={() => setView("search")}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Search
        </Button>
        <Button
          size="sm"
          variant={view === "status" ? "default" : "outline"}
          onClick={() => {
            setView("status");
            loadStatus();
          }}
        >
          <Activity className="h-3.5 w-3.5 mr-1.5" />
          Status
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {view === "list" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Daily Memory Logs</span>
              <Button size="sm" variant="ghost" onClick={loadFiles} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No daily memory files found
              </p>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-1">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm"
                      onClick={() => {
                        setView("view-daily");
                        loadFile(f.path);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono">{f.name}</span>
                      {f.date && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {f.date}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {hasMemoryMd && (
              <div className="mt-3 pt-3 border-t">
                <Badge variant="outline" className="text-xs">
                  MEMORY.md present
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(view === "edit-memory" || view === "view-daily") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => loadFile(activeFile!)}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reload
            </Button>
            <Button size="sm" onClick={saveFile} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save
            </Button>
            {hasChanges && (
              <span className="text-xs text-yellow-500">Unsaved changes</span>
            )}
            {saved && (
              <span className="text-xs text-emerald-500">Saved</span>
            )}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {activeFile ? `~/.openclaw/workspace/${activeFile}` : "Memory File"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-xs min-h-[350px] resize-y bg-muted/30"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {view === "search" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Semantic Memory Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="text-sm"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            {searchResults && (
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-[350px] overflow-auto">
                {searchResults}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {view === "status" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Memory Index Status</span>
              <Button size="sm" variant="ghost" onClick={loadStatus} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-[350px] overflow-auto">
              {memoryStatus || "Loading..."}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
