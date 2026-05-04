"use client";

import { Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemoryData, MemoryItem } from "@/lib/claw-ai/parts";

interface MemoryPartProps {
  data: MemoryData;
  onForget?: (item: MemoryItem) => void;
}

export function MemoryPart({ data, onForget }: MemoryPartProps) {
  const t = useT();
  const items = data.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("claw.parts.memory.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            {t("claw.parts.memory.empty")}
          </p>
        )}
        {items.map((m) => (
          <div
            key={m.id}
            className="group flex items-start gap-2 rounded-md border px-2.5 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{m.text}</p>
              {(m.category || m.rememberedAt) && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {m.category && <span>{m.category}</span>}
                  {m.category && m.rememberedAt && <span> · </span>}
                  {m.rememberedAt && (
                    <span>
                      {new Date(m.rememberedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>
            {onForget && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => onForget(m)}
                title={t("claw.parts.memory.forget")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
