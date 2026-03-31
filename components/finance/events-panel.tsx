"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useFinanceNews } from "@/lib/swr/hooks";
import type { TranslationKey } from "@/lib/i18n/types";

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface NewsCategory {
  value: string;
  label: string;
}


function timeAgo(dateStr: string, t: (key: TranslationKey) => string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t("finance.events.now");
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch {
    return "";
  }
}

export function NewsPanel() {
  const t = useT();
  const [category, setCategory] = useState("top");
  const { data, isLoading: loading } = useFinanceNews(category);
  const articles: NewsArticle[] = data?.articles ?? [];
  const categories: NewsCategory[] = data?.categories ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-1 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          {t("finance.events.title")}
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-[10px] bg-transparent border border-amber-900/40 rounded px-1.5 py-0.5 text-amber-300 outline-none"
        >
          {categories.length > 0
            ? categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#0a0a0f]">
                  {c.label}
                </option>
              ))
            : (
                <option value="top" className="bg-[#0a0a0f]">{t("finance.events.topStories")}</option>
              )}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          {t("common.loading")}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs">
          {t("finance.events.noArticles")}
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-0.5">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-1.5 py-1.5 rounded hover:bg-amber-950/40 transition-colors group"
            >
              <span className="text-[10px] text-amber-700 shrink-0 pt-0.5 w-6 text-right tabular-nums">
                {timeAgo(article.pubDate, t)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-100 leading-tight line-clamp-2 group-hover:text-amber-50">
                  {article.title}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {article.source}
                </p>
              </div>
              <ExternalLink className="size-2.5 text-amber-800 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
