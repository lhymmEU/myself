"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { OPENBB_MODULES, OPENBB_CATEGORIES } from "@/lib/modules/finance/openbb-modules";

interface CustomizeDrawerProps {
  enabledModules: string[];
  onToggle: (moduleId: string, enabled: boolean) => void;
}

export function CustomizeDrawer({ enabledModules, onToggle }: CustomizeDrawerProps) {
  const t = useT();
  const enabledSet = useMemo(() => new Set(enabledModules), [enabledModules]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="size-3.5" />
          {t("finance.market.customize")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("finance.market.customizeTitle")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {OPENBB_CATEGORIES.map((cat) => {
            const modules = OPENBB_MODULES.filter((m) => m.category === cat.id);
            if (modules.length === 0) return null;
            return (
              <div key={cat.id}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t(cat.labelKey as Parameters<typeof t>[0])}
                </h4>
                <div className="space-y-2">
                  {modules.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-medium truncate">
                          {t(mod.labelKey as Parameters<typeof t>[0])}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t(mod.descriptionKey as Parameters<typeof t>[0])}
                        </p>
                        {mod.requiredProviders && mod.requiredProviders.length > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {t("finance.market.requiresKey")}: {mod.requiredProviders.join(", ")}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={enabledSet.has(mod.id)}
                        onCheckedChange={(checked) => onToggle(mod.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
