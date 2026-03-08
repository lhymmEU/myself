"use client";

import { useState } from "react";
import { Plus, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

type CaptureMode = "expense" | "note";

export function QuickCapture() {
  const t = useT();
  const [mode, setMode] = useState<CaptureMode>("expense");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const modes: { key: CaptureMode; icon: typeof DollarSign; labelKey: TranslationKey }[] =
    [
      { key: "expense", icon: DollarSign, labelKey: "shared.quickCapture.expense" },
      { key: "note", icon: FileText, labelKey: "shared.quickCapture.note" },
    ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    setLoading(true);
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: mode, value: value.trim() }),
      });
      setValue("");
      toast.success(mode === "expense" ? t("shared.quickCapture.expenseAdded") : t("shared.quickCapture.noteAdded"));
    } catch {
      toast.error(t("shared.quickCapture.failedSave"));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {modes.map((m) => (
          <Button
            key={m.key}
            variant={mode === m.key ? "default" : "outline"}
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() => setMode(m.key)}
          >
            <m.icon className="h-3 w-3 mr-1" />
            {t(m.labelKey)}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            mode === "expense"
              ? t("shared.quickCapture.placeholderExpense")
              : t("shared.quickCapture.placeholderNote")
          }
          className="text-sm h-8"
        />
        <Button type="submit" size="sm" className="h-8" disabled={loading}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
