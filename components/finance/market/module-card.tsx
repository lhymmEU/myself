"use client";

import { type ReactNode, useCallback, createContext, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ModuleCardProps {
  moduleId: string;
  labelKey: string;
  missingProviders?: string[];
  children: ReactNode;
}

export function ModuleCard({ moduleId, labelKey, missingProviders, children }: ModuleCardProps) {
  const t = useT();

  // Module context is preserved as a noop hook so child modules that
  // call useModuleContext() keep compiling; nothing currently consumes
  // the data after the Ask-Claw integration was removed.
  const updateContext = useCallback(() => {}, []);

  const hasMissingKeys = missingProviders && missingProviders.length > 0;

  return (
    <Card id={`module-${moduleId}`}>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          {t(labelKey as Parameters<typeof t>[0])}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasMissingKeys ? (
          <ProviderKeysRequired missingProviders={missingProviders} />
        ) : (
          <ModuleContextProvider updateContext={updateContext}>
            {children}
          </ModuleContextProvider>
        )}
      </CardContent>
    </Card>
  );
}

const PROVIDER_NAMES: Record<string, { name: string; url: string }> = {
  fmp_api_key: { name: "Financial Modeling Prep", url: "https://financialmodelingprep.com/developer/docs" },
  polygon_api_key: { name: "Polygon.io", url: "https://polygon.io/dashboard/signup" },
  benzinga_api_key: { name: "Benzinga", url: "https://www.benzinga.com/apis" },
  fred_api_key: { name: "FRED", url: "https://fred.stlouisfed.org/docs/api/api_key.html" },
  nasdaq_api_key: { name: "Nasdaq Data Link", url: "https://data.nasdaq.com/sign-up" },
  intrinio_api_key: { name: "Intrinio", url: "https://intrinio.com/signup" },
  alpha_vantage_api_key: { name: "Alpha Vantage", url: "https://www.alphavantage.co/support/#api-key" },
  biztoc_api_key: { name: "BizToc", url: "https://api.biztoc.com" },
  tradier_api_key: { name: "Tradier", url: "https://developer.tradier.com/getting_started" },
  tradingeconomics_api_key: { name: "Trading Economics", url: "https://tradingeconomics.com/analytics/api.aspx" },
  tiingo_token: { name: "Tiingo", url: "https://api.tiingo.com/" },
};

function ProviderKeysRequired({ missingProviders }: { missingProviders: string[] }) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
      <KeyRound className="size-8 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {t("finance.market.keysRequired")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("finance.market.keysRequiredDesc")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {missingProviders.map((key) => {
          const info = PROVIDER_NAMES[key];
          if (!info) return null;
          return (
            <a
              key={key}
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              {info.name}
              <ExternalLink className="size-3" />
            </a>
          );
        })}
      </div>
      <a
        href="/dashboard/settings"
        className="text-xs text-primary hover:underline"
      >
        {t("finance.market.goToSettings")}
      </a>
    </div>
  );
}

const ModuleContextCtx = createContext<((data: Record<string, unknown>) => void) | null>(null);

function ModuleContextProvider({
  updateContext,
  children,
}: {
  updateContext: (data: Record<string, unknown>) => void;
  children: ReactNode;
}) {
  return (
    <ModuleContextCtx.Provider value={updateContext}>
      {children}
    </ModuleContextCtx.Provider>
  );
}

export function useModuleContext() {
  return useContext(ModuleContextCtx);
}
