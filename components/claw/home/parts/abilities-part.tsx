"use client";

import { Sparkles, Play } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AbilitiesData, AbilityItem } from "@/lib/claw-ai/parts";

interface AbilitiesPartProps {
  data: AbilitiesData;
  onRun?: (ability: AbilityItem) => void;
}

export function AbilitiesPart({ data, onRun }: AbilitiesPartProps) {
  const t = useT();
  const items = data.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("claw.parts.abilities.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            {t("claw.parts.abilities.empty")}
          </p>
        )}
        {items.map((a) => (
          <div
            key={a.slug}
            className="flex items-center gap-2 rounded-md border px-2.5 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.name}</p>
              {a.description && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {a.description}
                </p>
              )}
            </div>
            {onRun && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRun(a)}
                className="h-7 px-2 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                {t("claw.parts.abilities.run")}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
