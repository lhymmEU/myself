"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderInput,
  FolderMinus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import type { MarkedItem, MarkedCollection } from "@/lib/modules/marked/types";

interface Props {
  item: MarkedItem;
  collections: MarkedCollection[];
  onMutate: () => void;
}

export function ItemCard({ item, collections, onMutate }: Props) {
  const t = useT();
  const [showNotes, setShowNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editSourceTag, setEditSourceTag] = useState(item.sourceTag ?? "");
  const [editNotes, setEditNotes] = useState(item.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cleanUrl = (() => {
    try {
      const u = new URL(item.url);
      const host = u.hostname.replace(/^www\./, "");
      const path = u.pathname === "/" ? "" : u.pathname;
      const display = host + path;
      return display.length > 60 ? display.slice(0, 57) + "..." : display;
    } catch {
      return item.url;
    }
  })();

  const saveEdit = async () => {
    try {
      await fetch("/api/marked", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "item",
          id: item.id,
          title: editTitle.trim() || item.title,
          sourceTag: editSourceTag.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      setEditing(false);
      onMutate();
    } catch {
      toast.error(t("marked.failedSave"));
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(
        `/api/marked?entity=item&id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      setConfirmDelete(false);
      onMutate();
    } catch {
      toast.error(t("marked.failedDelete"));
    }
  };

  const moveTo = async (collectionId: string | null) => {
    try {
      await fetch("/api/marked", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          id: item.id,
          collectionId,
        }),
      });
      onMutate();
    } catch {
      toast.error(t("marked.failedSave"));
    }
  };

  return (
    <>
      <div className="group flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
        {/* Favicon */}
        <div className="mt-0.5 shrink-0">
          {item.favicon ? (
            <img
              src={item.favicon}
              alt=""
              className="h-5 w-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {item.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline truncate"
            >
              {item.title}
            </a>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {item.sourceTag && (
              <span className="text-xs text-primary/80 font-medium">
                {item.sourceTag}
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate">
              {cleanUrl}
            </span>
          </div>

          {/* Notes toggle */}
          {item.notes && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showNotes && "rotate-180",
                )}
              />
              {t("marked.notes")}
            </button>
          )}
          {showNotes && item.notes && (
            <p className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {item.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              {t("marked.editItem")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-3.5 w-3.5 mr-2" />
                {t("marked.moveToCollection")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {collections.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => moveTo(c.id)}
                    disabled={c.id === item.collectionId}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
                {item.collectionId && (
                  <DropdownMenuItem onClick={() => moveTo(null)}>
                    <FolderMinus className="h-3.5 w-3.5 mr-2" />
                    {t("marked.removeFromCollection")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {t("marked.deleteItem")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={(open) => !open && setEditing(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marked.editItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t("marked.titleLabel")}
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t("marked.titlePlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t("marked.sourceTag")}
              </label>
              <Input
                value={editSourceTag}
                onChange={(e) => setEditSourceTag(e.target.value)}
                placeholder={t("marked.sourceTagPlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t("marked.notes")}
              </label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder={t("marked.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveEdit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marked.deleteItem")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("marked.deleteItemConfirm")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
