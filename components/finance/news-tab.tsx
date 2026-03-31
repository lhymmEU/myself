"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { useOpenBB } from "@/lib/swr/hooks";
import { SearchInput } from "./search-input";
import { ConnectionBanner } from "./connection-banner";
import { useT } from "@/lib/i18n/context";
import type { NewsArticle } from "@/lib/modules/finance/types";

export function NewsTab() {
  const t = useT();
  const [mode, setMode] = useState<"world" | "company">("world");
  const [companySymbol, setCompanySymbol] = useState("");

  const { data: healthData } = useOpenBB<{ connected: boolean }>("__health");
  const connected = healthData?.connected ?? false;

  const endpoint = mode === "company" && companySymbol ? "news/company" : "news/world";
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

  if (!connected && healthData !== undefined) {
    return <ConnectionBanner />;
  }

  const articles = newsData?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("world");
              setCompanySymbol("");
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "world"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("finance.news.world")}
          </button>
          <button
            onClick={() => setMode("company")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "company"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t("finance.news.company")}
          </button>
        </div>
        {mode === "company" && (
          <div className="w-full sm:w-64">
            <SearchInput
              placeholder={t("finance.news.symbolPlaceholder")}
              onSearch={handleSearch}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <Card key={`${article.url}-${i}`}>
              <CardContent className="py-3 px-4">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {article.text}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                  </div>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Newspaper className="size-8 mb-2 opacity-50" />
          <p className="text-sm">{t("finance.news.noArticles")}</p>
        </div>
      )}
    </div>
  );
}
