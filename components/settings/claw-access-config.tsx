"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shell } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { CLAW_ACCESS_MODULES } from "@/lib/modules/settings/defaults";

interface ClawAccessConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function ClawAccessConfig({ settings, onUpdate }: ClawAccessConfigProps) {
  const t = useT();

  return (
    <Card>
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2">
          <Shell className="size-5" />
          {t("settings.clawAccess.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground text-left">
          {t("settings.clawAccess.description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {CLAW_ACCESS_MODULES.map((mod) => {
          const key = `claw_access_${mod}`;
          const enabled = settings[key] === "true";
          return (
            <div key={mod} className="flex items-center justify-between">
              <Label htmlFor={key} className="flex flex-col gap-0.5 items-start">
                <span>{t(`settings.clawAccess.modules.${mod}`)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t(`settings.clawAccess.hints.${mod}`)}
                </span>
              </Label>
              <Switch
                id={key}
                checked={enabled}
                onCheckedChange={(checked) =>
                  onUpdate(key, checked ? "true" : "false")
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
