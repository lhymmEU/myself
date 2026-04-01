"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

const PROVIDERS = [
  { key: "fmp_api_key", name: "Financial Modeling Prep", url: "https://financialmodelingprep.com/developer/docs" },
  { key: "polygon_api_key", name: "Polygon.io", url: "https://polygon.io/dashboard/signup" },
  { key: "benzinga_api_key", name: "Benzinga", url: "https://www.benzinga.com/apis" },
  { key: "fred_api_key", name: "FRED (Federal Reserve)", url: "https://fred.stlouisfed.org/docs/api/api_key.html" },
  { key: "nasdaq_api_key", name: "Nasdaq Data Link", url: "https://data.nasdaq.com/sign-up" },
  { key: "intrinio_api_key", name: "Intrinio", url: "https://intrinio.com/signup" },
  { key: "alpha_vantage_api_key", name: "Alpha Vantage", url: "https://www.alphavantage.co/support/#api-key" },
  { key: "biztoc_api_key", name: "BizToc", url: "https://api.biztoc.com" },
  { key: "tradier_api_key", name: "Tradier", url: "https://developer.tradier.com/getting_started" },
  { key: "tradingeconomics_api_key", name: "Trading Economics", url: "https://tradingeconomics.com/analytics/api.aspx" },
  { key: "tiingo_token", name: "Tiingo", url: "https://api.tiingo.com/" },
] as const;

interface FinanceProvidersConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function FinanceProvidersConfig({ settings, onUpdate }: FinanceProvidersConfigProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const toggleVisible = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const configuredCount = PROVIDERS.filter((p) => settings[p.key]?.length > 0).length;

  const syncCredentials = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/finance/openbb/credentials", { method: "PUT" });
      if (!res.ok) throw new Error();
      toast.success(t("settings.providers.syncSuccess"));
    } catch {
      toast.error(t("settings.providers.syncFailed"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
          <CollapsibleTrigger asChild>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="size-5" />
                {t("settings.providers.title")}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-normal text-muted-foreground">
                  {configuredCount}/{PROVIDERS.length} {t("settings.providers.configured")}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("settings.providers.description")}
            </p>

            <div className="space-y-3">
              {PROVIDERS.map((provider) => {
                const hasKey = (settings[provider.key] ?? "").length > 0;
                const isVisible = visibleKeys.has(provider.key);
                return (
                  <div key={provider.key} className="flex items-center gap-3">
                    {hasKey ? (
                      <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Label className="text-sm font-medium">{provider.name}</Label>
                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title={t("settings.providers.getKey")}
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type={isVisible ? "text" : "password"}
                          value={settings[provider.key] ?? ""}
                          onChange={(e) => onUpdate(provider.key, e.target.value)}
                          placeholder={t("settings.providers.placeholder")}
                          className="h-8 text-sm font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => toggleVisible(provider.key)}
                        >
                          {isVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">{t("settings.providers.tradierAccountType")}</Label>
                <Select
                  value={settings.tradier_account_type ?? "sandbox"}
                  onValueChange={(v) => onUpdate("tradier_account_type", v)}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={syncCredentials}
              disabled={syncing}
              className="w-full"
            >
              {syncing && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t("settings.providers.syncToOpenBB")}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
