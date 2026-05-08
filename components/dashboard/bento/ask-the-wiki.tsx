"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onPinned?: () => void;
}

/**
 * Inline "ask the wiki" bar. Submitting pins the question as a query card.
 * The user opens the bento, presses `?`, types a question, hits Enter.
 * openclaw will answer on the next ingest pass (or when the user opens
 * the card detail and re-runs the wiki maintainer).
 */
export function AskTheWiki({ onPinned }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (!editable && e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (open && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit() {
    const q = value.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/insights?action=pinQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to pin question");
        return;
      }
      toast.success("Question pinned. Run a wiki ingest to get an answer.");
      setValue("");
      setOpen(false);
      onPinned?.();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
      >
        <Search className="h-3 w-3" />
        <span>Ask the wiki</span>
        <kbd className="text-[10px] font-mono px-1 rounded bg-muted">
          ?
        </kbd>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border bg-background pl-3 pr-1 py-1",
        "min-w-[280px] max-w-[420px]",
      )}
    >
      <Search className="h-3.5 w-3.5 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Ask anything across your wiki…"
        className="h-7 border-none px-0 shadow-none focus-visible:ring-0 text-sm bg-transparent"
        disabled={busy}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || busy}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-foreground text-background disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pin"}
      </button>
    </div>
  );
}
