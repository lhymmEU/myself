"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import type { MarketplaceSkill } from "@/lib/modules/claw/types";

interface SkillsMarketplaceProps {
  connectionId: string | null;
  connected: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SkillCard({
  skill,
  onInstall,
  installing,
}: {
  skill: MarketplaceSkill;
  onInstall: (skill: MarketplaceSkill) => void;
  installing: string | null;
}) {
  return (
    <div className="px-3 py-2.5 rounded-md border border-border/50 hover:border-border transition-colors space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-xs truncate">
              {skill.displayName}
            </span>
            {skill.certified && (
              <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
            )}
          </div>
          {skill.owner && (
            <span className="text-[10px] text-muted-foreground">
              {skill.owner}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 shrink-0"
          onClick={() => onInstall(skill)}
          disabled={installing === skill.slug}
        >
          {installing === skill.slug ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Download className="h-3 w-3 mr-1" />
              Install
            </>
          )}
        </Button>
      </div>
      {skill.summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {skill.summary}
        </p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {skill.downloads > 0 && (
          <span className="flex items-center gap-0.5">
            <Download className="h-2.5 w-2.5" />
            {formatCount(skill.downloads)}
          </span>
        )}
        {skill.stars > 0 && (
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" />
            {formatCount(skill.stars)}
          </span>
        )}
        <a
          href={skill.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 hover:text-foreground transition-colors ml-auto"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          View
        </a>
      </div>
    </div>
  );
}

function SourceTab({
  source,
  connectionId,
  connected,
}: {
  source: "clawhub" | "vercel";
  connectionId: string | null;
  connected: boolean;
}) {
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<string | null>(null);

  const load = useCallback(
    async (query?: string) => {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/claw/skills/marketplace?source=${source}&limit=20`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setSkills(data.skills ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [source]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    load(searchQuery.trim() || undefined);
  };

  const handleInstall = async (skill: MarketplaceSkill) => {
    if (!connectionId || !connected) {
      setInstallResult("Connect to a server first");
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
        setInstallResult(`Installed ${skill.displayName}`);
      } else {
        setInstallResult(data.stderr || data.error || "Install failed");
      }
    } catch (err) {
      setInstallResult(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(null);
      setTimeout(() => setInstallResult(null), 5000);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          placeholder={`Search ${source === "clawhub" ? "ClawHub" : "Vercel"} skills...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-xs h-7"
        />
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleSearch} disabled={loading}>
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

      <ScrollArea className="h-full">
        <div className="space-y-1.5 pr-2">
          {skills.length === 0 && !loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No skills found
            </p>
          ) : (
            skills.map((skill) => (
              <SkillCard
                key={`${skill.source}-${skill.slug}`}
                skill={skill}
                onInstall={handleInstall}
                installing={installing}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function SkillsMarketplace({
  connectionId,
  connected,
}: SkillsMarketplaceProps) {
  if (!connected) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
          <Server className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">Connect to install skills</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5" />
          Skills Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        <Tabs defaultValue="clawhub" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-7 shrink-0">
            <TabsTrigger value="clawhub" className="text-xs h-6">
              ClawHub
            </TabsTrigger>
            <TabsTrigger value="vercel" className="text-xs h-6">
              Vercel Skills
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clawhub" className="flex-1 min-h-0 mt-2">
            <SourceTab
              source="clawhub"
              connectionId={connectionId}
              connected={connected}
            />
          </TabsContent>
          <TabsContent value="vercel" className="flex-1 min-h-0 mt-2">
            <SourceTab
              source="vercel"
              connectionId={connectionId}
              connected={connected}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
