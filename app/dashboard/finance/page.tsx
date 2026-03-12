"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveView } from "@/components/finance/live-view";
import { PlanView } from "@/components/finance/plan-view";
import { useT } from "@/lib/i18n/context";

export default function FinancePage() {
  const t = useT();

  return (
    <div className="space-y-6 px-8 py-4">
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
