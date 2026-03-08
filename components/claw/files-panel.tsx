"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Server,
  Loader2,
  Folder,
  FileIcon,
  ChevronLeft,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  HardDrive,
  Home,
  AlertTriangle,
} from "lucide-react";

interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
}

interface FilesPanelProps {
  connectionId: string | null;
  connected: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FilesPanel({ connectionId, connected }: FilesPanelProps) {
  const t = useT();
  const [currentPath, setCurrentPath] = useState("~");
  const [resolvedPath, setResolvedPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("~");

  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [creatingDir, setCreatingDir] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const listDir = useCallback(
    async (path: string) => {
      if (!connectionId || !connected) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          connectionId,
          action: "list",
          path,
        });
        const res = await fetch(`/api/claw/files?${params}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setEntries(data.entries ?? []);
        setResolvedPath(data.path ?? path);
        setCurrentPath(path);
        setPathInput(data.path ?? path);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("claw.files.failedList"));
      } finally {
        setLoading(false);
      }
    },
    [connectionId, connected, t]
  );

  useEffect(() => {
    if (connected) listDir("~");
    else {
      setEntries([]);
      setCurrentPath("~");
      setResolvedPath("");
      setPathInput("~");
      setError(null);
    }
  }, [connected, listDir]);

  const navigateTo = (name: string) => {
    const next =
      resolvedPath === "/" ? `/${name}` : `${resolvedPath}/${name}`;
    listDir(next);
  };

  const goUp = () => {
    const parent = resolvedPath.replace(/\/[^/]+$/, "") || "/";
    listDir(parent);
  };

  const goHome = () => listDir("~");

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) listDir(pathInput.trim());
  };

  const handleDownload = async (entry: FileEntry) => {
    if (!connectionId) return;
    setDownloadingFile(entry.name);
    try {
      const filePath = `${resolvedPath}/${entry.name}`;
      const params = new URLSearchParams({
        connectionId,
        action: "download",
        path: filePath,
      });
      const res = await fetch(`/api/claw/files?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("claw.files.downloadFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("claw.files.downloadFailed"));
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !connectionId) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("connectionId", connectionId);
      fd.append("action", "upload");
      fd.append("path", resolvedPath);
      fd.append("file", file);
      const res = await fetch("/api/claw/files", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      listDir(resolvedPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("claw.files.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (entry: FileEntry) => {
    if (!connectionId) return;
    setDeleting(entry.name);
    setError(null);
    try {
      const filePath = `${resolvedPath}/${entry.name}`;
      const fd = new FormData();
      fd.append("connectionId", connectionId);
      fd.append("action", "delete");
      fd.append("path", filePath);
      const res = await fetch("/api/claw/files", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      listDir(resolvedPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("claw.files.deleteFailed"));
    } finally {
      setDeleting(null);
    }
  };

  const handleMkdir = async () => {
    if (!connectionId || !newDirName.trim()) return;
    setCreatingDir(true);
    setError(null);
    try {
      const dirPath = `${resolvedPath}/${newDirName.trim()}`;
      const fd = new FormData();
      fd.append("connectionId", connectionId);
      fd.append("action", "mkdir");
      fd.append("path", dirPath);
      const res = await fetch("/api/claw/files", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMkdirOpen(false);
      setNewDirName("");
      listDir(resolvedPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("claw.files.failedCreateFolder"));
    } finally {
      setCreatingDir(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t("claw.files.connectToBrowse")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={goUp} title={t("claw.files.goUp")}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={goHome} title={t("claw.files.home")}>
          <Home className="h-3.5 w-3.5" />
        </Button>
        <form onSubmit={handlePathSubmit} className="flex-1 flex gap-1.5">
          <Input
            className="h-8 text-xs font-mono"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
          />
          <Button size="sm" type="submit" variant="outline" disabled={loading}>
            {t("common.go")}
          </Button>
        </form>
        <Button
          size="sm"
          variant="outline"
          onClick={() => listDir(resolvedPath || currentPath)}
          disabled={loading}
          title={t("common.refresh")}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          )}
          {t("claw.files.upload")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setNewDirName("");
            setMkdirOpen(true);
          }}
        >
          <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("claw.files.newFolder")}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto font-mono truncate max-w-[50%]">
          {resolvedPath}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/20 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* File listing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            {entries.length} {t("claw.files.items")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">{t("claw.files.tableHeaders.name")}</th>
                  <th className="text-right py-2 px-3 font-medium w-20">
                    {t("claw.files.tableHeaders.size")}
                  </th>
                  <th className="text-right py-2 px-3 font-medium w-36">
                    {t("claw.files.tableHeaders.modified")}
                  </th>
                  <th className="text-right py-2 px-3 font-medium w-20">
                    {t("claw.files.tableHeaders.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("claw.files.emptyDir")}
                    </td>
                  </tr>
                )}
                {entries.map((entry) => (
                  <tr
                    key={entry.name}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-1.5 px-3">
                      {entry.isDir ? (
                        <button
                          className="flex items-center gap-1.5 text-left hover:underline font-medium"
                          onClick={() => navigateTo(entry.name)}
                        >
                          <Folder className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{entry.name}</span>
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{entry.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                      {entry.isDir ? "—" : formatSize(entry.size)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.mtime)}
                    </td>
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {!entry.isDir && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDownload(entry)}
                            disabled={downloadingFile === entry.name}
                            title={t("claw.files.download")}
                          >
                            {downloadingFile === entry.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(entry)}
                          disabled={deleting === entry.name}
                          title={t("common.delete")}
                        >
                          {deleting === entry.name ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Folder dialog */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("claw.files.createNewFolder")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("claw.files.folderName")}
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleMkdir();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMkdirOpen(false)}
              disabled={creatingDir}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleMkdir}
              disabled={creatingDir || !newDirName.trim()}
            >
              {creatingDir ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
