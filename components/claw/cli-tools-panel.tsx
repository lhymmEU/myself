"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  ExternalLink,
  Terminal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface CliTool {
  category: string;
  subcategory: string | null;
  name: string;
  url: string;
  description: string;
}

interface CategorySummary {
  name: string;
  count: number;
}

const PAGE_SIZE = 8;

export function CliToolsPanel() {
  const t = useT();
  const [tools, setTools] = useState<CliTool[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        let url = "/api/claw/cli-tools?";
        if (opts?.refresh) url += "refresh=1&";
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setTools(data.tools ?? []);
        setCategories(data.categories ?? []);
        setTotalAll(data.totalAll ?? 0);
        setLastUpdated(data.lastUpdated ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("claw.cliTools.failedLoad")
        );
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = tools;
    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.subcategory?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [tools, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [activeCategory, searchQuery]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            {t("claw.cliTools.title")}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => load({ refresh: true })}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        {totalAll > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {categories.length} {t("claw.cliTools.categories")} · {totalAll}{" "}
            {t("claw.cliTools.tools")}
            {lastUpdated && (
              <>
                {" · "}
                {t("claw.cliTools.synced")}{" "}
                {new Date(lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Search */}
        <div className="flex gap-1.5 items-center">
          <Input
            placeholder={t("claw.cliTools.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-7 min-w-0"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 shrink-0"
            disabled={loading}
            onClick={() => setSearchQuery("")}
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>

        {/* Category pills */}
        <div className="flex gap-1 flex-wrap max-h-20 overflow-y-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              !activeCategory
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("claw.cliTools.allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() =>
                setActiveCategory(
                  activeCategory === cat.name ? null : cat.name
                )
              }
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                activeCategory === cat.name
                  ? "bg-muted border-border text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.name}{" "}
              <span className="opacity-50">{cat.count}</span>
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Tool list */}
        <div className="space-y-1">
          {loading && tools.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pageItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {t("claw.cliTools.noResults")}
            </p>
          ) : (
            pageItems.map((tool, i) => (
              <div
                key={`${tool.category}-${tool.name}-${i}`}
                className="group flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium truncate hover:underline"
                    >
                      {tool.name}
                    </a>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {tool.description && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {tool.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {tool.subcategory && (
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1.5"
                    >
                      {tool.subcategory}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground tabular-nums min-w-[3rem] text-center">
                {page + 1} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
