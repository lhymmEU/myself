"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/context";

import { PersonalDashboard } from "@/components/finance/personal/personal-dashboard";
import { TransactionList } from "@/components/finance/personal/transaction-list";
import { BudgetView } from "@/components/finance/personal/budget-view";
import { InvestmentPortfolio } from "@/components/finance/personal/investment-portfolio";

export default function FinancePage() {
  const t = useT();

  return (
    <div className="space-y-4 px-8 py-4">
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
    </div>
  );
}
