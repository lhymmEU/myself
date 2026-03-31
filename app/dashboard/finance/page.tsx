"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/finance/overview-tab";
import { EquityTab } from "@/components/finance/equity-tab";
import { CryptoTab } from "@/components/finance/crypto-tab";
import { EconomyTab } from "@/components/finance/economy-tab";
import { NewsTab } from "@/components/finance/news-tab";
import { useT } from "@/lib/i18n/context";

export default function FinancePage() {
  const t = useT();

  return (
    <div className="space-y-6 px-8 py-4">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {t("finance.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="equity">{t("finance.tabs.equity")}</TabsTrigger>
          <TabsTrigger value="crypto">{t("finance.tabs.crypto")}</TabsTrigger>
          <TabsTrigger value="economy">
            {t("finance.tabs.economy")}
          </TabsTrigger>
          <TabsTrigger value="news">{t("finance.tabs.news")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="equity" className="mt-4">
          <EquityTab />
        </TabsContent>

        <TabsContent value="crypto" className="mt-4">
          <CryptoTab />
        </TabsContent>

        <TabsContent value="economy" className="mt-4">
          <EconomyTab />
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <NewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
