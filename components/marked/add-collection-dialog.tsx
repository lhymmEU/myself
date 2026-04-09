"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { Plus } from "lucide-react";
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
  onCreated: () => void;
}

export function AddCollectionDialog({ onCreated }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "collection",
          name: name.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setName("");
      setNotes("");
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
        if (!o) {
          setName("");
          setNotes("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("marked.addCollection")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.collectionName")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("marked.collectionNamePlaceholder")}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">
              {t("marked.collectionNotes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("marked.collectionNotesPlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setName("");
              setNotes("");
              setOpen(false);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
