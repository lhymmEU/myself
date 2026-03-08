"use client";

import { DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveView } from "@/components/finance/live-view";
import { PlanView } from "@/components/finance/plan-view";
import { useT } from "@/lib/i18n/context";

export default function FinancePage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          {t("finance.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("finance.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">{t("finance.tabs.livePortfolio")}</TabsTrigger>
          <TabsTrigger value="plan">{t("finance.tabs.marketTerminal")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <LiveView />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlanView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
