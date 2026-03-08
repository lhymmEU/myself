"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Server,
  Loader2,
  Download,
  Star,
  ExternalLink,
  ShieldCheck,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { MarketplaceSkill } from "@/lib/modules/claw/types";

interface SkillsMarketplaceProps {
  connectionId: string | null;
  connected: boolean;
  onSkillInstalled?: () => void;
}

const PAGE_SIZE = 5;

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SourceTab({
  source,
  connectionId,
  connected,
  onSkillInstalled,
}: {
  source: "clawhub" | "vercel";
  connectionId: string | null;
  connected: boolean;
  onSkillInstalled?: () => void;
}) {
  const t = useT();
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(skills.length / PAGE_SIZE)),
    [skills.length]
  );
  const pageSkills = useMemo(
    () => skills.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [skills, page]
  );

  const load = useCallback(
    async (query?: string) => {
      setLoading(true);
      setError(null);
      setPage(0);
      try {
        let url = `/api/claw/skills/marketplace?source=${source}&limit=30`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setSkills(data.skills ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("claw.marketplace.failedLoad"));
      } finally {
        setLoading(false);
      }
    },
    [source, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    load(searchQuery.trim() || undefined);
  };

  const handleInstall = async (skill: MarketplaceSkill) => {
    if (!connectionId || !connected) {
      setInstallResult(t("claw.marketplace.connectFirst"));
      return;
    }
    setInstalling(skill.slug);
    setInstallResult(null);
    try {
      const res = await fetch("/api/claw/skills/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          slug: skill.slug,
          source: skill.source,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallResult(`${t("claw.marketplace.installed")} ${skill.displayName}`);
        onSkillInstalled?.();
      } else {
        setInstallResult(data.stderr || data.error || t("claw.marketplace.installFailed"));
      }
    } catch (err) {
      setInstallResult(err instanceof Error ? err.message : t("claw.marketplace.installFailed"));
    } finally {
      setInstalling(null);
      setTimeout(() => setInstallResult(null), 5000);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          placeholder={source === "clawhub" ? t("claw.marketplace.searchClawHub") : t("claw.marketplace.searchVercel")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-xs h-7 min-w-0"
        />
        <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {installResult && (
        <p className="text-xs text-emerald-400">{installResult}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left font-medium py-1.5 px-2">{t("claw.marketplace.skill")}</th>
              <th className="text-right font-medium py-1.5 px-2 w-14">
                <Download className="h-3 w-3 ml-auto" />
              </th>
              <th className="text-right font-medium py-1.5 px-2 w-14">
                <Star className="h-3 w-3 ml-auto" />
              </th>
              <th className="font-medium py-1.5 px-2 w-[4.5rem]" />
            </tr>
          </thead>
          <tbody>
            {pageSkills.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-8">
                  {t("claw.marketplace.noSkillsFound")}
                </td>
              </tr>
            ) : (
              pageSkills.map((skill) => (
                <tr
                  key={`${skill.source}-${skill.slug}`}
                  className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-1.5 px-2 max-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={skill.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium truncate hover:underline"
                      >
                        {skill.displayName}
                      </a>
                      {skill.certified && (
                        <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                      )}
                      <a
                        href={skill.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-muted-foreground truncate mt-0.5">
                      {skill.summary}
                    </p>
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground tabular-nums align-top whitespace-nowrap">
                    {skill.downloads > 0 ? formatCount(skill.downloads) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground tabular-nums align-top whitespace-nowrap">
                    {skill.stars > 0 ? formatCount(skill.stars) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right align-top">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 whitespace-nowrap"
                      onClick={() => handleInstall(skill)}
                      disabled={installing === skill.slug}
                    >
                      {installing === skill.slug ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" />
                          {t("common.install")}
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {skills.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, skills.length)} of {skills.length}
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
    </div>
  );
}

export function SkillsMarketplace({
  connectionId,
  connected,
  onSkillInstalled,
}: SkillsMarketplaceProps) {
  const t = useT();
  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Server className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">{t("claw.marketplace.connectToInstall")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5" />
          {t("claw.marketplace.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="clawhub">
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="clawhub" className="text-xs h-6">
              {t("claw.marketplace.clawHub")}
            </TabsTrigger>
            <TabsTrigger value="vercel" className="text-xs h-6">
              {t("claw.marketplace.vercelSkills")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clawhub" className="mt-2">
            <SourceTab
              source="clawhub"
              connectionId={connectionId}
              connected={connected}
              onSkillInstalled={onSkillInstalled}
            />
          </TabsContent>
          <TabsContent value="vercel" className="mt-2">
            <SourceTab
              source="vercel"
              connectionId={connectionId}
              connected={connected}
              onSkillInstalled={onSkillInstalled}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
