"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Eye, EyeOff } from "lucide-react";
import { SECRET_CATEGORIES } from "@/lib/modules/vault/types";
import type { SecretCategory } from "@/lib/modules/vault/types";

interface AddSecretProps {
  onCreated: () => void;
}

export function AddSecret({ onCreated }: AddSecretProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<SecretCategory>("password");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setValue("");
    setCategory("password");
    setNotes("");
    setTagsInput("");
    setShowValue(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          value: value.trim(),
          category,
          notes: notes.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create secret");
        return;
      }

      reset();
      setOpen(false);
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const isLargeValue =
    category === "note" ||
    category === "ssh_key" ||
    category === "certificate" ||
    category === "crypto_wallet";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Secret
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Secret</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secret-name">Name</Label>
              <Input
                id="secret-name"
                placeholder="e.g. GitHub Token"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SecretCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECRET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-value">Secret Value</Label>
            <div className="relative">
              {isLargeValue ? (
                <textarea
                  id="secret-value"
                  className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 font-mono pr-10"
                  placeholder="Paste your secret here..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  style={
                    !showValue
                      ? {
                          color: "transparent",
                          textShadow: "0 0 8px currentColor",
                          caretColor: "var(--foreground)",
                        }
                      : undefined
                  }
                />
              ) : (
                <Input
                  id="secret-value"
                  type={showValue ? "text" : "password"}
                  placeholder="Enter secret value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="pr-10 font-mono"
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-2 h-7 w-7"
                onClick={() => setShowValue(!showValue)}
              >
                {showValue ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-notes">Notes (optional)</Label>
            <textarea
              id="secret-notes"
              className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Additional notes (also encrypted)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-tags">Tags (optional)</Label>
            <Input
              id="secret-tags"
              placeholder="work, production, aws (comma separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || !value.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Encrypt & Save"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
