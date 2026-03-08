"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/modules/settings/defaults";
import { DollarSign, Calendar } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

interface FinanceDefaultsProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function FinanceDefaults({ settings, onUpdate }: FinanceDefaultsProps) {
  const t = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="size-5" />
          {t("settings.finance.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("settings.finance.defaultCurrency")}</Label>
          <Select
            value={settings.default_currency ?? "USD"}
            onValueChange={(v) => onUpdate("default_currency", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.finance.budgetPeriod")}</Label>
          <Select
            value={settings.budget_period ?? "monthly"}
            onValueChange={(v) => onUpdate("budget_period", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("settings.finance.weekly")}</SelectItem>
              <SelectItem value="monthly">{t("settings.finance.monthly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="size-4" />
            {t("settings.finance.fiscalYearStart")}
          </Label>
          <Select
            value={settings.fiscal_year_start ?? "1"}
            onValueChange={(v) => onUpdate("fiscal_year_start", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_KEYS.map((key, i) => (
                <SelectItem key={key} value={String(i + 1)}>
                  {t(`settings.finance.months.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
