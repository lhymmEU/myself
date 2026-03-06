"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Server,
  Loader2,
  Puzzle,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Pencil,
} from "lucide-react";
import type { InstalledSkill } from "@/lib/modules/claw/types";

interface InstalledSkillsPanelProps {
  connectionId: string | null;
  connected: boolean;
  refreshKey?: number;
  onEditSkill?: (path: string) => void;
}

export function InstalledSkillsPanel({
  connectionId,
  connected,
  refreshKey,
  onEditSkill,
}: InstalledSkillsPanelProps) {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!connectionId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/claw/skills/installed?connectionId=${encodeURIComponent(connectionId)}`
      );
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
  }, [connectionId, connected]);

  useEffect(() => {
    if (connected) load();
    else {
      setSkills([]);
      setError(null);
    }
  }, [connected, load, refreshKey]);

  if (!connected) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
          <Server className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">Connect to view installed skills</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Puzzle className="h-3.5 w-3.5" />
            Installed Skills
            {skills.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {skills.length}
              </Badge>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-6 w-6 p-0">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        {error && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}
        {skills.length === 0 && !loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No skills installed
          </p>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-0.5 pr-2">
              {skills.map((skill) => (
                <div key={skill.path}>
                  <button
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors flex items-start gap-1.5 text-xs"
                    onClick={() =>
                      setExpanded(expanded === skill.path ? null : skill.path)
                    }
                  >
                    {expanded === skill.path ? (
                      <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{skill.name}</div>
                      {skill.description && (
                        <div className="text-muted-foreground truncate mt-0.5">
                          {skill.description}
                        </div>
                      )}
                    </div>
                  </button>
                  {expanded === skill.path && (
                    <div className="ml-5 mb-2 px-2 py-1.5 bg-muted/30 rounded text-[11px] space-y-1.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FolderOpen className="h-3 w-3 shrink-0" />
                        <span className="font-mono truncate">{skill.path}</span>
                      </div>
                      {onEditSkill && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditSkill(skill.path)}
                          className="h-5 px-2 text-[10px]"
                        >
                          <Pencil className="h-2.5 w-2.5 mr-1" />
                          Edit Skill
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
