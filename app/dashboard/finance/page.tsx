"use client";

import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, BarChart3 } from "lucide-react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/swr/config";
import { useT } from "@/lib/i18n/context";

import { PersonalDashboard } from "@/components/finance/personal/personal-dashboard";
import { TransactionList } from "@/components/finance/personal/transaction-list";
import { BudgetView } from "@/components/finance/personal/budget-view";
import { InvestmentPortfolio } from "@/components/finance/personal/investment-portfolio";
import { ModuleGrid } from "@/components/finance/market/module-grid";
import { CustomizeDrawer } from "@/components/finance/market/customize-drawer";

type FinanceMode = "personal" | "market";

export default function FinancePage() {
  const t = useT();

  const { data: settingsData, mutate: mutateSettings } = useSWR<Record<string, string>>(
    "/api/settings",
    swrFetcher,
  );

  const defaultMode = (settingsData?.finance_default_mode ?? "market") as FinanceMode;
  const [mode, setMode] = useState<FinanceMode | null>(null);
  const activeMode = mode ?? defaultMode;

  const enabledModules: string[] = useMemo(() => {
    try {
      return JSON.parse(settingsData?.finance_enabled_modules ?? "[]");
    } catch {
      return [];
    }
  }, [settingsData?.finance_enabled_modules]);

  const moduleOrder: string[] = useMemo(() => {
    try {
      return JSON.parse(settingsData?.finance_module_order ?? "[]");
    } catch {
      return [];
    }
  }, [settingsData?.finance_module_order]);

  const handleToggleModule = useCallback(
    async (moduleId: string, enabled: boolean) => {
      const nextModules = enabled
        ? [...enabledModules, moduleId]
        : enabledModules.filter((m) => m !== moduleId);
      const nextOrder = enabled
        ? [...moduleOrder, moduleId]
        : moduleOrder;

      mutateSettings(
        (prev) => ({
          ...prev,
          finance_enabled_modules: JSON.stringify(nextModules),
          finance_module_order: JSON.stringify(nextOrder),
        }),
        false,
      );

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "finance_enabled_modules", value: JSON.stringify(nextModules) }),
      });

      if (enabled) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "finance_module_order", value: JSON.stringify(nextOrder) }),
        });
      }
    },
    [enabledModules, moduleOrder, mutateSettings],
  );

  return (
    <div className="space-y-4 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("personal")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeMode === "personal"
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="size-3.5" />
            {t("finance.modes.personal")}
          </button>
          <button
            onClick={() => setMode("market")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeMode === "market"
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-3.5" />
            {t("finance.modes.market")}
          </button>
        </div>

        {activeMode === "market" && (
          <CustomizeDrawer
            enabledModules={enabledModules}
            onToggle={handleToggleModule}
          />
        )}
      </div>

      {activeMode === "personal" ? (
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">
              {t("finance.personal.tabs.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="transactions">
              {t("finance.personal.tabs.transactions")}
            </TabsTrigger>
            <TabsTrigger value="budget">
              {t("finance.personal.tabs.budget")}
            </TabsTrigger>
            <TabsTrigger value="investments">
              {t("finance.personal.tabs.investments")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <PersonalDashboard />
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <TransactionList />
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            <BudgetView />
          </TabsContent>

          <TabsContent value="investments" className="mt-4">
            <InvestmentPortfolio />
          </TabsContent>
        </Tabs>
      ) : (
        <ModuleGrid
          enabledModules={enabledModules}
          moduleOrder={moduleOrder}
        />
      )}
    </div>
  );
}
