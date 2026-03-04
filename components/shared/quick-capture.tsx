"use client";

import { useState } from "react";
import { Plus, CheckSquare, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type CaptureMode = "todo" | "expense" | "note";

export function QuickCapture() {
  const [mode, setMode] = useState<CaptureMode>("todo");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const modes: { key: CaptureMode; icon: typeof CheckSquare; label: string }[] =
    [
      { key: "todo", icon: CheckSquare, label: "Todo" },
      { key: "expense", icon: DollarSign, label: "Expense" },
      { key: "note", icon: FileText, label: "Note" },
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
      toast.success(`${mode === "todo" ? "Todo" : mode === "expense" ? "Expense" : "Note"} added`);
    } catch {
      toast.error("Failed to save");
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
            {m.label}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            mode === "todo"
              ? "What needs doing?"
              : mode === "expense"
              ? "e.g. Coffee $4.50"
              : "Jot down an idea..."
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
