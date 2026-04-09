"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import {
  FolderOpen,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { MarkedCollection } from "@/lib/modules/marked/types";

interface Props {
  collections: MarkedCollection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMutate: () => void;
  onShare: (c: MarkedCollection) => void;
}

export function CollectionList({
  collections,
  selectedId,
  onSelect,
  onMutate,
  onShare,
}: Props) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MarkedCollection | null>(
    null,
  );

  const startEdit = (c: MarkedCollection) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditNotes(c.notes ?? "");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await fetch("/api/marked", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "collection",
          id: editingId,
          name: editName.trim(),
          notes: editNotes.trim() || null,
        }),
      });
      setEditingId(null);
      onMutate();
    } catch {
      toast.error(t("marked.failedSave"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(
        `/api/marked?entity=collection&id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      if (selectedId === deleteTarget.id) onSelect(null);
      setDeleteTarget(null);
      onMutate();
    } catch {
      toast.error(t("marked.failedDelete"));
    }
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* All items */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            selectedId === null
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("marked.allItems")}</span>
        </button>

        {/* Uncollected */}
        <button
          onClick={() => onSelect("__uncollected__")}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            selectedId === "__uncollected__"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <Inbox className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("marked.uncollected")}</span>
        </button>

        {/* Collections */}
        {collections.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
              selectedId === c.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
            onClick={() => onSelect(c.id)}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{c.name}</span>
            {c.notes && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(c);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  {t("marked.editCollection")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(c);
                  }}
                >
                  <Share2 className="h-3.5 w-3.5 mr-2" />
                  {t("marked.share")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(c);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {t("marked.deleteCollection")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {collections.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            {t("marked.noCollections")}
          </p>
        )}
      </nav>

      {/* Edit collection dialog */}
      <Dialog
        open={!!editingId}
        onOpenChange={(open) => !open && setEditingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marked.editCollection")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t("marked.collectionNamePlaceholder")}
            />
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder={t("marked.collectionNotesPlaceholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveEdit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marked.deleteCollection")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("marked.deleteCollectionConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
