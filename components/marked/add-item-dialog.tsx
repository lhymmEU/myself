"use client";

import { useState, useCallback } from "react";
import { useT } from "@/lib/i18n/context";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  collectionId?: string | null;
  onCreated: () => void;
}

export function AddItemDialog({ collectionId, onCreated }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [sourceTag, setSourceTag] = useState("");
  const [notes, setNotes] = useState("");
  const [favicon, setFavicon] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUrl("");
    setTitle("");
    setSourceTag("");
    setNotes("");
    setFavicon("");
    setOgImage("");
    setOgDescription("");
  };

  const fetchMeta = useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) return;
      let normalized = trimmed;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }
      setUrl(normalized);
      setFetching(true);
      try {
        const res = await fetch(
          `/api/marked/meta?url=${encodeURIComponent(normalized)}`,
        );
        if (!res.ok) throw new Error();
        const meta = await res.json();
        if (meta.title) setTitle(meta.title);
        if (meta.sourceTag) setSourceTag(meta.sourceTag);
        if (meta.favicon) setFavicon(meta.favicon);
        if (meta.image) setOgImage(meta.image);
        if (meta.description) setOgDescription(meta.description);
      } catch {
        toast.error(t("marked.failedFetch"));
      } finally {
        setFetching(false);
      }
    },
    [t],
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && /^https?:\/\//i.test(pasted.trim())) {
      e.preventDefault();
      setUrl(pasted.trim());
      fetchMeta(pasted.trim());
    }
  };

  const handleUrlBlur = () => {
    if (url.trim() && !title) {
      fetchMeta(url);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "item",
          url: url.trim(),
          title: title.trim() || url.trim(),
          sourceTag: sourceTag.trim() || undefined,
          notes: notes.trim() || undefined,
          favicon: favicon || undefined,
          ogImage: ogImage || undefined,
          ogDescription: ogDescription || undefined,
          collectionId: collectionId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      reset();
      setOpen(false);
      onCreated();
    } catch {
      toast.error(t("marked.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("marked.addItem")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("marked.addItem")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.url")}
            </label>
            <div className="relative">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                onBlur={handleUrlBlur}
                placeholder={t("marked.urlPlaceholder")}
                autoFocus
              />
              {fetching && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {fetching && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("marked.fetchingMeta")}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.titleLabel")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("marked.titlePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.sourceTag")}
            </label>
            <Input
              value={sourceTag}
              onChange={(e) => setSourceTag(e.target.value)}
              placeholder={t("marked.sourceTagPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.notes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("marked.notesPlaceholder")}
              rows={3}
            />
          </div>
          {ogDescription && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {ogDescription}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!url.trim() || saving || fetching}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
