"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Shell,
  Wand2,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Palette,
  Unplug,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useAssignedJobs, useCharacterAppearance } from "@/lib/swr/hooks";
import dynamic from "next/dynamic";
import type { LobsterColors } from "./vrm-viewer";

const CharacterViewer = dynamic(
  () =>
    import("@/components/dashboard/vrm-viewer").then((m) => m.CharacterViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-[200px] rounded-md bg-muted/30 animate-pulse" />
    ),
  }
);

interface InstalledSkill {
  name: string;
  description: string;
  path: string;
}

interface AssignedJob {
  id: string;
  name: string;
  description: string | null;
  status: string;
  cronJobId: string | null;
  createdAt: number;
}

const DEFAULT_LOBSTER_COLORS: Required<LobsterColors> = {
  shell: "#c0392b",
  shellDark: "#922b21",
  belly: "#e8a87c",
  eye: "#222",
};

const COLOR_LABELS: Record<keyof LobsterColors, string> = {
  shell: "Shell",
  shellDark: "Shell Dark",
  belly: "Belly",
  eye: "Eyes",
};

export function ClawPanel() {
  const t = useT();
  const { data: jobsData, mutate: mutateJobs } = useAssignedJobs();
  const { data: appearanceData } = useCharacterAppearance("lobster");
  const jobs: AssignedJob[] = jobsData?.jobs ?? [];
  const [clawSkills, setClawSkills] = useState<InstalledSkill[]>([]);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({ name: "", description: "" });
  const [clawConnected, setClawConnected] = useState(false);

  const lobsterColorsFromApi: Required<LobsterColors> = appearanceData?.appearance
    ? {
        shell: appearanceData.appearance.shellColor ?? DEFAULT_LOBSTER_COLORS.shell,
        shellDark: appearanceData.appearance.shellDarkColor ?? DEFAULT_LOBSTER_COLORS.shellDark,
        belly: appearanceData.appearance.bellyColor ?? DEFAULT_LOBSTER_COLORS.belly,
        eye: appearanceData.appearance.eyeColor ?? DEFAULT_LOBSTER_COLORS.eye,
      }
    : DEFAULT_LOBSTER_COLORS;
  const [lobsterColors, setLobsterColors] = useState<Required<LobsterColors>>(DEFAULT_LOBSTER_COLORS);
  const [colorsInitialized, setColorsInitialized] = useState(false);
  if (appearanceData && !colorsInitialized) {
    setLobsterColors(lobsterColorsFromApi);
    setColorsInitialized(true);
  }

  const checkConnection = useCallback(async () => {
    try {
      const connRes = await fetch("/api/claw/connections");
      const connData = await connRes.json();
      const connections = Array.isArray(connData) ? connData : (connData.connections ?? []);
      if (connections.length === 0) {
        setClawConnected(false);
        return null;
      }
      const connId = connections[0]?.id;
      if (!connId) {
        setClawConnected(false);
        return null;
      }
      const statusRes = await fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connId, action: "status" }),
      });
      const statusData = await statusRes.json();
      const connected = statusData.connected === true;
      setClawConnected(connected);
      return connected ? connId : null;
    } catch {
      setClawConnected(false);
      return null;
    }
  }, []);

  const fetchClawSkills = useCallback(async () => {
    try {
      const connId = await checkConnection();
      if (!connId) {
        setClawSkills([]);
        return;
      }
      const res = await fetch(
        `/api/claw/skills/installed?connectionId=${encodeURIComponent(connId)}`
      );
      const data = await res.json();
      if (!data.error) setClawSkills(data.skills ?? []);
    } catch {
      // silently fail
    }
  }, [checkConnection]);

  useEffect(() => {
    fetchClawSkills();
  }, [fetchClawSkills]);

  const saveAppearance = useCallback(async (colors: Required<LobsterColors>) => {
    try {
      await fetch("/api/dashboard/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: "lobster",
          shellColor: colors.shell,
          shellDarkColor: colors.shellDark,
          bellyColor: colors.belly,
          eyeColor: colors.eye,
        }),
      });
    } catch {
      // silently fail
    }
  }, []);

  const handleColorChange = (key: keyof LobsterColors, value: string) => {
    const updated = { ...lobsterColors, [key]: value };
    setLobsterColors(updated);
    saveAppearance(updated);
  };

  const handleSaveJob = async () => {
    if (!jobForm.name.trim()) return;
    try {
      if (editingJobId) {
        await fetch("/api/dashboard/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: editingJobId,
            data: jobForm,
          }),
        });
      } else {
        await fetch("/api/dashboard/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", ...jobForm }),
        });
      }
      setEditingJobId(null);
      setAddingJob(false);
      setJobForm({ name: "", description: "" });
      await mutateJobs();
    } catch {
      // silently fail
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await fetch("/api/dashboard/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      await mutateJobs();
    } catch {
      // silently fail
    }
  };

  const startEditJob = (job: AssignedJob) => {
    setEditingJobId(job.id);
    setAddingJob(true);
    setJobForm({
      name: job.name,
      description: job.description ?? "",
    });
  };

  const cancelEditJob = () => {
    setEditingJobId(null);
    setAddingJob(false);
    setJobForm({ name: "", description: "" });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shell className="h-4 w-4" />
          {t("dashboard.game.clawPanel.title")}
          {!clawConnected && (
            <Badge variant="secondary" className="text-[10px] gap-1 ml-1">
              <Unplug className="h-2.5 w-2.5" />
              {t("claw.dm.notConnected")}
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-2">
                {(Object.keys(COLOR_LABELS) as (keyof LobsterColors)[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="color"
                      value={lobsterColors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="h-5 w-5 rounded border cursor-pointer"
                    />
                    <span>{COLOR_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <CharacterViewer
          type="lobster"
          lobsterColors={lobsterColors}
          grayscale={!clawConnected}
          className={`flex-1 min-h-[200px] rounded-lg overflow-hidden ${
            clawConnected
              ? "bg-gradient-to-b from-red-950/10 to-red-950/30"
              : "bg-gradient-to-b from-muted/20 to-muted/50"
          }`}
        />

        <div>
          <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            {t("dashboard.game.clawPanel.skills")}
          </h3>
          <ScrollArea className="max-h-[120px]">
            <div className="space-y-0.5">
              {clawSkills.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  {clawConnected
                    ? t("dashboard.game.clawPanel.noSkills")
                    : t("claw.dm.notConnected")}
                </p>
              ) : (
                clawSkills.map((skill) => (
                  <div
                    key={skill.path}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50"
                  >
                    <Wand2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium truncate block">
                        {skill.name || skill.path}
                      </span>
                      {skill.description && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {skill.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              {t("dashboard.game.clawPanel.assignedJobs")}
            </h3>
            {!addingJob && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAddingJob(true)}
                className="h-6 text-xs"
              >
                <Plus className="h-3 w-3 mr-0.5" />
                {t("dashboard.game.clawPanel.addJob")}
              </Button>
            )}
          </div>

          {addingJob && (
            <div className="space-y-1.5 p-2 rounded-md border bg-muted/30 mb-1.5">
              <Input
                value={jobForm.name}
                onChange={(e) =>
                  setJobForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("dashboard.game.clawPanel.jobNamePlaceholder")}
                className="h-6 text-xs"
                autoFocus
              />
              <Input
                value={jobForm.description}
                onChange={(e) =>
                  setJobForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t("dashboard.game.clawPanel.jobDescriptionPlaceholder")}
                className="h-6 text-xs"
              />
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditJob}
                  className="h-5 px-1.5 text-[10px]"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveJob}
                  disabled={!jobForm.name.trim()}
                  className="h-5 px-1.5 text-[10px]"
                >
                  <Check className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-0.5">
              {jobs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3">
                  {t("dashboard.game.clawPanel.noJobs")}
                </p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50"
                  >
                    <Briefcase className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block">
                        {job.name}
                      </span>
                      {job.description && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {job.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditJob(job)}
                        className="h-5 w-5 p-0"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteJob(job.id)}
                        className="h-5 w-5 p-0 text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
