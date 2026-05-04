"use client";

import { Clock, Trash2, Pause, Play, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { RoutinesData, RoutineItem } from "@/lib/claw-ai/parts";

interface RoutinesPartProps {
  data: RoutinesData;
  onToggle?: (routine: RoutineItem, next: boolean) => void;
  onDelete?: (routine: RoutineItem) => void;
  onAdd?: () => void;
}

function formatNextRun(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = d.getTime() - now;
    const day = 86400000;
    if (diff < 0) return "Past due";
    if (diff < day) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function RoutinesPart({
  data,
  onToggle,
  onDelete,
  onAdd,
}: RoutinesPartProps) {
  const t = useT();
  const items = data.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t("claw.parts.routines.title")}
        </CardTitle>
        {onAdd && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("claw.home.cards.routinesAdd")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            {t("claw.parts.routines.empty")}
          </p>
        )}
        {items.map((routine) => (
          <div
            key={routine.id}
            className="flex items-center gap-2 rounded-md border px-2.5 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{routine.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {routine.cadence}
                {" · "}
                {t("claw.parts.routines.nextLabel")}:{" "}
                {formatNextRun(routine.nextRun)}
              </p>
            </div>
            {onToggle ? (
              <Switch
                checked={routine.enabled}
                onCheckedChange={(v) => onToggle(routine, v)}
                className="scale-75"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {routine.enabled ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </span>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(routine)}
                className="h-6 w-6 p-0 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
