"use client";

import { useState, useMemo } from "react";
import { Plus, MoreVertical, Pencil, Trash2, Clock, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n/context";
import { useMindMapScenes } from "@/lib/swr/hooks";
import type { MindMapScene, SceneMode } from "@/lib/modules/mind-map/types";

interface CanvasGridProps {
  mode?: SceneMode;
  onOpen: (sceneId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function CanvasGrid({ mode = "mind", onOpen }: CanvasGridProps) {
  const t = useT();
  const { data: rawScenes, isLoading: loading, mutate } = useMindMapScenes(mode);
  const scenes: MindMapScene[] = useMemo(() => {
    const arr: MindMapScene[] = Array.isArray(rawScenes) ? rawScenes : [];
    return [...arr].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [rawScenes]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [targetScene, setTargetScene] = useState<MindMapScene | null>(null);

  const handleCreate = async () => {
    const name = nameInput.trim() || t("mindMap.grid.untitled");
    try {
      const res = await fetch("/api/mind-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode }),
      });
      const scene: MindMapScene = await res.json();
      setCreateDialogOpen(false);
      setNameInput("");
      onOpen(scene.id);
    } catch (err) {
      console.error("Failed to create scene:", err);
    }
  };

  const handleRename = async () => {
    if (!targetScene) return;
    const name = nameInput.trim();
    if (!name) return;
    try {
      await fetch("/api/mind-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetScene.id, name }),
      });
      setRenameDialogOpen(false);
      setNameInput("");
      setTargetScene(null);
      mutate();
    } catch (err) {
      console.error("Failed to rename scene:", err);
    }
  };

  const handleDelete = async () => {
    if (!targetScene) return;
    try {
      await fetch(`/api/mind-map?id=${targetScene.id}`, { method: "DELETE" });
      setDeleteDialogOpen(false);
      setTargetScene(null);
      mutate();
    } catch (err) {
      console.error("Failed to delete scene:", err);
    }
  };

  const openRenameDialog = (scene: MindMapScene) => {
    setTargetScene(scene);
    setNameInput(scene.name);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (scene: MindMapScene) => {
    setTargetScene(scene);
    setDeleteDialogOpen(true);
  };

  const handleToggleTodoSource = async (scene: MindMapScene) => {
    try {
      await fetch("/api/mind-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scene.id,
          isTodoSource: !scene.isTodoSource,
        }),
      });
      mutate();
    } catch (err) {
      console.error("Failed to toggle todo source:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <p className="text-sm">{t("mindMap.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Create new canvas card */}
        <button
          onClick={() => {
            setNameInput("");
            setCreateDialogOpen(true);
          }}
          className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-background hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 aspect-[4/3] cursor-pointer"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {t("mindMap.grid.createNew")}
          </span>
        </button>

        {/* Existing canvas cards */}
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className="group relative flex flex-col rounded-xl border bg-card hover:border-primary/40 transition-all duration-200 aspect-[4/3] cursor-pointer overflow-hidden"
            onClick={() => onOpen(scene.id)}
          >
            <div className="relative flex-1 flex items-center justify-center bg-muted/30 p-4">
              <CanvasPreview elements={scene.elements} />
              {scene.isTodoSource && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  <ListTodo className="w-3 h-3" />
                  {t("mindMap.grid.todoSourceBadge")}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 border-t bg-card">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{scene.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(scene.updatedAt)}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mode === "mind" && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTodoSource(scene);
                      }}
                    >
                      <ListTodo className="w-4 h-4" />
                      {scene.isTodoSource
                        ? t("mindMap.grid.unsetTodoSource")
                        : t("mindMap.grid.setTodoSource")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(scene);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    {t("mindMap.grid.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(scene);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("mindMap.grid.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mindMap.grid.createTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={t("mindMap.grid.namePlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("mindMap.grid.cancel")}
            </Button>
            <Button onClick={handleCreate}>{t("mindMap.grid.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mindMap.grid.renameTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={t("mindMap.grid.namePlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t("mindMap.grid.cancel")}
            </Button>
            <Button onClick={handleRename}>{t("mindMap.grid.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mindMap.grid.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("mindMap.grid.deleteConfirm")}
          </p>
          {targetScene && (
            <p className="text-sm font-medium">&ldquo;{targetScene.name}&rdquo;</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("mindMap.grid.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("mindMap.grid.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CanvasPreview({ elements }: { elements: string }) {
  let parsed: Array<{ x: number; y: number; width: number; height: number; type: string; isDeleted?: boolean }> = [];
  try {
    parsed = JSON.parse(elements);
  } catch {
    parsed = [];
  }

  const visible = parsed.filter((el) => !el.isDeleted);

  if (visible.length === 0) {
    return (
      <div className="text-muted-foreground/40 text-xs italic">
        Empty canvas
      </div>
    );
  }

  const xs = visible.map((el) => el.x);
  const ys = visible.map((el) => el.y);
  const xe = visible.map((el) => el.x + (el.width || 0));
  const ye = visible.map((el) => el.y + (el.height || 0));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xe);
  const maxY = Math.max(...ye);
  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;

  const padding = 8;
  const viewW = 160;
  const viewH = 100;
  const scale = Math.min(
    (viewW - padding * 2) / contentW,
    (viewH - padding * 2) / contentH
  );

  return (
    <svg width={viewW} height={viewH} className="opacity-60">
      {visible.slice(0, 80).map((el, i) => {
        const x = padding + (el.x - minX) * scale;
        const y = padding + (el.y - minY) * scale;
        const w = Math.max((el.width || 4) * scale, 2);
        const h = Math.max((el.height || 4) * scale, 2);

        if (el.type === "ellipse") {
          return (
            <ellipse
              key={i}
              cx={x + w / 2}
              cy={y + h / 2}
              rx={w / 2}
              ry={h / 2}
              fill="currentColor"
              className="text-muted-foreground/50"
            />
          );
        }
        if (el.type === "diamond") {
          const cx = x + w / 2;
          const cy = y + h / 2;
          return (
            <polygon
              key={i}
              points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
              fill="currentColor"
              className="text-muted-foreground/50"
            />
          );
        }
        if (el.type === "arrow" || el.type === "line") {
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + w}
              y2={y + h}
              stroke="currentColor"
              strokeWidth={1}
              className="text-muted-foreground/40"
            />
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={1}
            fill="currentColor"
            className="text-muted-foreground/50"
          />
        );
      })}
    </svg>
  );
}
