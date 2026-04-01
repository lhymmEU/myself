"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutDashboard } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { OPENBB_MODULES, OPENBB_CATEGORIES } from "@/lib/modules/finance/openbb-modules";

interface FinanceDisplayConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function FinanceDisplayConfig({ settings, onUpdate }: FinanceDisplayConfigProps) {
  const t = useT();

  const enabledModules: string[] = useMemo(() => {
    try {
      return JSON.parse(settings.finance_enabled_modules ?? "[]");
    } catch {
      return [];
    }
  }, [settings.finance_enabled_modules]);

  const toggleModule = (id: string) => {
    const next = enabledModules.includes(id)
      ? enabledModules.filter((m) => m !== id)
      : [...enabledModules, id];
    onUpdate("finance_enabled_modules", JSON.stringify(next));

    const currentOrder: string[] = (() => {
      try { return JSON.parse(settings.finance_module_order ?? "[]"); } catch { return []; }
    })();
    if (!enabledModules.includes(id)) {
      onUpdate("finance_module_order", JSON.stringify([...currentOrder, id]));
    } else {
      onUpdate("finance_module_order", JSON.stringify(currentOrder.filter((m) => m !== id)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="size-5" />
          {t("settings.financeDisplay.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>{t("settings.financeDisplay.defaultMode")}</Label>
          <Select
            value={settings.finance_default_mode ?? "market"}
            onValueChange={(v) => onUpdate("finance_default_mode", v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">{t("settings.financeDisplay.modePersonal")}</SelectItem>
              <SelectItem value="market">{t("settings.financeDisplay.modeMarket")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>{t("settings.financeDisplay.enabledModules")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.financeDisplay.enabledModulesDesc")}
          </p>

          {OPENBB_CATEGORIES.map((cat) => {
            const modules = OPENBB_MODULES.filter((m) => m.category === cat.id);
            if (modules.length === 0) return null;
            return (
              <div key={cat.id} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(cat.labelKey as Parameters<typeof t>[0])}
                </h4>
                <div className="space-y-1.5">
                  {modules.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0">
                        <span className="text-sm">
                          {t(mod.labelKey as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      <Switch
                        checked={enabledModules.includes(mod.id)}
                        onCheckedChange={() => toggleModule(mod.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
