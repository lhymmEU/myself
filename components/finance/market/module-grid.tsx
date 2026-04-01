"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/swr/config";
import { ModuleCard } from "./module-card";
import { CategoryNav } from "./category-nav";
import { OPENBB_MODULES, type OpenBBCategory } from "@/lib/modules/finance/openbb-modules";

import { MarketIndicesWidget } from "./widgets/market-indices-widget";
import { TreasuryRatesWidget } from "./widgets/treasury-rates-widget";
import { EquityWidget } from "./widgets/equity-widget";
import { CryptoWidget } from "./widgets/crypto-widget";
import { EconomyWidget } from "./widgets/economy-widget";
import { ForexWidget } from "./widgets/forex-widget";
import { NewsWidget } from "./widgets/news-widget";
import { EtfWidget } from "./widgets/etf-widget";
import { CommodityWidget } from "./widgets/commodity-widget";
import { DerivativesWidget } from "./widgets/derivatives-widget";
import { FixedIncomeWidget } from "./widgets/fixed-income-widget";
import { Sp500MultiplesWidget } from "./widgets/sp500-multiples-widget";
import { TechnicalWidget } from "./widgets/technical-widget";
import { QuantitativeWidget } from "./widgets/quantitative-widget";
import { RegulatorsWidget } from "./widgets/regulators-widget";
import { CongressWidget } from "./widgets/congress-widget";

const WIDGET_MAP: Record<string, () => React.JSX.Element> = {
  "market-indices": () => <MarketIndicesWidget />,
  "sp500-multiples": () => <Sp500MultiplesWidget />,
  equity: () => <EquityWidget />,
  "equity-screener": () => <EquityWidget />,
  "treasury-rates": () => <TreasuryRatesWidget />,
  "bond-indices": () => <FixedIncomeWidget />,
  "mortgage-indices": () => <FixedIncomeWidget />,
  "tips-yields": () => <FixedIncomeWidget />,
  crypto: () => <CryptoWidget />,
  "currency-snapshots": () => <ForexWidget />,
  "reference-rates": () => <ForexWidget />,
  etf: () => <EtfWidget />,
  "economy-indicators": () => <EconomyWidget />,
  "interest-rates": () => <EconomyWidget />,
  "house-price-index": () => <EconomyWidget />,
  commodity: () => <CommodityWidget />,
  "petroleum-status": () => <CommodityWidget />,
  "options-chains": () => <DerivativesWidget />,
  "unusual-options": () => <DerivativesWidget />,
  "news-world": () => <NewsWidget />,
  "news-company": () => <NewsWidget />,
  technical: () => <TechnicalWidget />,
  quantitative: () => <QuantitativeWidget />,
  regulators: () => <RegulatorsWidget />,
  congress: () => <CongressWidget />,
};

interface ModuleGridProps {
  enabledModules: string[];
  moduleOrder: string[];
}

export function ModuleGrid({ enabledModules, moduleOrder }: ModuleGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<OpenBBCategory | "all">("all");

  const { data: providerStatus } = useSWR<Record<string, boolean>>(
    "/api/finance/openbb/provider-status",
    swrFetcher,
    { dedupingInterval: 60_000 },
  );

  const sortedModules = useMemo(() => {
    const enabledSet = new Set(enabledModules);
    const ordered = moduleOrder.filter((id) => enabledSet.has(id));
    const remaining = enabledModules.filter((id) => !moduleOrder.includes(id));
    return [...ordered, ...remaining];
  }, [enabledModules, moduleOrder]);

  const filteredModules = useMemo(() => {
    if (selectedCategory === "all") return sortedModules;
    return sortedModules.filter((id) => {
      const mod = OPENBB_MODULES.find((m) => m.id === id);
      return mod?.category === selectedCategory;
    });
  }, [sortedModules, selectedCategory]);

  const enabledCategories = useMemo(() => {
    const cats = new Set<OpenBBCategory>();
    for (const id of enabledModules) {
      const mod = OPENBB_MODULES.find((m) => m.id === id);
      if (mod) cats.add(mod.category);
    }
    return cats;
  }, [enabledModules]);

  const rendered = new Set<string>();

  return (
    <div className="space-y-4">
      <CategoryNav
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        enabledCategories={enabledCategories}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredModules.map((moduleId) => {
          const mod = OPENBB_MODULES.find((m) => m.id === moduleId);
          if (!mod) return null;

          const widgetFn = WIDGET_MAP[moduleId];
          if (!widgetFn) return null;

          const widgetKey = widgetFn.toString();
          if (rendered.has(widgetKey)) return null;
          rendered.add(widgetKey);

          let missingProviders: string[] | undefined;
          if (mod.requiredProviders && mod.requiredProviders.length > 0) {
            if (!providerStatus) {
              missingProviders = mod.requiredProviders;
            } else {
              missingProviders = mod.requiredProviders.filter(
                (key) => !providerStatus[key],
              );
            }
          }

          const hasMissingKeys = missingProviders && missingProviders.length > 0;

          return (
            <ModuleCard
              key={moduleId}
              moduleId={moduleId}
              labelKey={mod.labelKey}
              missingProviders={missingProviders}
            >
              {hasMissingKeys ? null : widgetFn()}
            </ModuleCard>
          );
        })}
      </div>
    </div>
  );
}
