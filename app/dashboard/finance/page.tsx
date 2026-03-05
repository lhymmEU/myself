"use client";

import { DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveView } from "@/components/finance/live-view";
import { PlanView } from "@/components/finance/plan-view";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Finance
        </h1>
        <p className="text-muted-foreground">
          Live portfolio tracking and market intelligence
        </p>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live Portfolio</TabsTrigger>
          <TabsTrigger value="plan">Market Terminal</TabsTrigger>
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
