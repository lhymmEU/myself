"use client";

import { useState, useRef, useCallback } from "react";
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
import { Plus, Loader2, Eye, EyeOff, Upload, FileCheck, FolderOpen } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";
import { SECRET_CATEGORIES } from "@/lib/modules/vault/types";
import type { SecretCategory } from "@/lib/modules/vault/types";
import { createSecretUi } from "@/lib/modules/vault/api";
import { isLocal } from "@/lib/core/runtime";

interface AddSecretProps {
  onCreated: () => void;
}

export function AddSecret({ onCreated }: AddSecretProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<SecretCategory>("password");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [showPathInput, setShowPathInput] = useState(false);
  const [loadingPath, setLoadingPath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadFromPath = useCallback(async () => {
    if (!pathInput.trim()) return;
    setLoadingPath(true);
    setError(null);
    try {
      const res = await fetch("/api/claw/read-local-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("vault.addSecret.failedReadFile"));
        return;
      }
      setValue(data.contents);
      setUploadedFileName(data.fileName);
      setShowPathInput(false);
      setPathInput("");
      if (!name.trim() && data.fileName) {
        setName(data.fileName);
      }
    } catch {
      setError(t("vault.addSecret.failedLoadFile"));
    } finally {
      setLoadingPath(false);
    }
  }, [pathInput, name, t]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setValue(text);
      setUploadedFileName(file.name);
      if (!name.trim()) {
        setName(file.name.replace(/\.[^.]+$/, ""));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [name]);

  function reset() {
    setName("");
    setValue("");
    setCategory("password");
    setNotes("");
    setTagsInput("");
    setShowValue(false);
    setError(null);
    setUploadedFileName(null);
    setPathInput("");
    setShowPathInput(false);
    setLoadingPath(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createSecretUi({
        name: name.trim(),
        value: value.trim(),
        category,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("vault.addSecret.failedCreate"),
      );
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
          {t("vault.addSecret.addSecret")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("vault.addSecret.dialogTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secret-name">{t("common.name")}</Label>
              <Input
                id="secret-name"
                placeholder={t("vault.addSecret.placeholderName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vault.addSecret.category")}</Label>
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
                      {t(`vault.categories.${cat.value}` as TranslationKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="secret-value">{t("vault.addSecret.secretValue")}</Label>
              {isLargeValue && (
                <div className="flex items-center gap-1.5">
                  {uploadedFileName && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <FileCheck className="h-3 w-3" />
                      {uploadedFileName}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {t("common.browse")}
                  </Button>
                  {isLocal() && (
                    <Button
                      type="button"
                      size="sm"
                      variant={showPathInput ? "secondary" : "outline"}
                      className="h-6 px-2 text-[11px]"
                      onClick={() => setShowPathInput(!showPathInput)}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {t("vault.addSecret.fromPath")}
                    </Button>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pem,.key,.pub,.crt,.cer,.txt,*"
              onChange={handleFileUpload}
            />
            {showPathInput && (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <Input
                    className="font-mono text-xs h-8"
                    placeholder={t("vault.addSecret.placeholderSshKey")}
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLoadFromPath())}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 shrink-0"
                    disabled={!pathInput.trim() || loadingPath}
                    onClick={handleLoadFromPath}
                  >
                    {loadingPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("common.load")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("claw.connection.pathTip")} <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">{t("claw.connection.pathTipKey")}</kbd> {t("claw.connection.pathTipSuffix")}
                </p>
              </div>
            )}
            <div className="relative">
              {isLargeValue ? (
                <textarea
                  id="secret-value"
                  className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 font-mono pr-10"
                  placeholder={
                    category === "ssh_key"
                      ? t("vault.addSecret.placeholderPasteKey")
                      : category === "certificate"
                        ? t("vault.addSecret.placeholderPasteCert")
                        : t("vault.addSecret.placeholderPasteSecret")
                  }
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setUploadedFileName(null);
                  }}
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
                  placeholder={t("vault.addSecret.placeholderGeneral")}
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
            <Label htmlFor="secret-notes">{t("vault.addSecret.notes")}</Label>
            <textarea
              id="secret-notes"
              className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t("vault.addSecret.placeholderNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-tags">{t("vault.addSecret.tags")}</Label>
            <Input
              id="secret-tags"
              placeholder={t("vault.addSecret.placeholderTags")}
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
              t("vault.addSecret.encryptAndSave")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
