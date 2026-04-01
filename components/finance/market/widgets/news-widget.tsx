"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "@/components/finance/search-input";
import { ConnectionBanner } from "@/components/finance/connection-banner";
import { useModuleContext } from "@/components/finance/market/module-card";
import { useT } from "@/lib/i18n/context";
import type { NewsArticle } from "@/lib/modules/finance/types";

export function NewsWidget() {
  const t = useT();
  const updateContext = useModuleContext();
  const [mode, setMode] = useState<"world" | "company">("world");
  const [companySymbol, setCompanySymbol] = useState("");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const endpoint =
    mode === "company" && companySymbol ? "news/company" : "news/world";
  const provider = mode === "company" && companySymbol ? "yfinance" : "biztoc";
  const params: Record<string, string> = { limit: "20", provider };
  if (mode === "company" && companySymbol) {
    params.symbol = companySymbol;
  }

  const { data: newsData, isLoading } = useOpenBB<{
    results: NewsArticle[];
  }>(connected ? endpoint : null, params);

  const handleSearch = useCallback((q: string) => {
    if (q) {
      setMode("company");
      setCompanySymbol(q.toUpperCase());
    } else {
      setMode("world");
      setCompanySymbol("");
    }
  }, []);

  const articles = newsData?.results ?? [];
  const headlineSlice = useMemo(
    () => articles.slice(0, 8).map((a) => a.title),
    [newsData],
  );

  useEffect(() => {
    if (!updateContext) return;
    updateContext({
      mode,
      symbol: companySymbol || undefined,
      headlines: headlineSlice,
    });
  }, [updateContext, mode, companySymbol, headlineSlice]);

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("world");
              setCompanySymbol("");
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "world"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("finance.news.world")}
          </button>
          <button
            type="button"
            onClick={() => setMode("company")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "company"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("finance.news.company")}
          </button>
        </div>
        {mode === "company" && (
          <div className="w-full sm:w-56 shrink-0">
            <SearchInput
              placeholder={t("finance.news.symbolPlaceholder")}
              onSearch={handleSearch}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("finance.modules.widget.newsFeedHint")}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {articles.map((article, i) => (
            <div
              key={`${article.url}-${i}`}
              className="rounded-md border px-3 py-2"
            >
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-muted-foreground">
                      {article.source && <span>{article.source}</span>}
                      {article.date && (
                        <span>{article.date.slice(0, 10)}</span>
                      )}
                      {article.symbols && (
                        <span className="font-medium text-foreground/70">
                          {article.symbols}
                        </span>
                      )}
                    </div>
                    {article.text && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {article.text}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                </div>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Newspaper className="size-7 mb-2 opacity-50" />
          <p className="text-sm">{t("finance.news.noArticles")}</p>
        </div>
      )}
    </div>
  );
}
