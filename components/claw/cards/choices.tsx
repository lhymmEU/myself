"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  question?: string;
  options: string[];
  allowCustom?: boolean;
  onChoose?: (text: string) => void;
}

export function ChoicesCard({
  question,
  options,
  allowCustom = true,
  onChoose,
}: Props) {
  const [used, setUsed] = useState(false);
  const [custom, setCustom] = useState("");

  const pick = (text: string) => {
    if (used || !text.trim()) return;
    setUsed(true);
    onChoose?.(text.trim());
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 space-y-3 transition-opacity",
        used && "opacity-60 pointer-events-none",
      )}
    >
      {question && (
        <p className="text-sm font-medium text-foreground">{question}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <Button
            key={i}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left"
            disabled={used}
            onClick={() => pick(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
      {allowCustom !== false && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type your own…"
            disabled={used}
            className="sm:flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim() && !used) {
                e.preventDefault();
                pick(custom);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={used || !custom.trim()}
            onClick={() => pick(custom)}
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
