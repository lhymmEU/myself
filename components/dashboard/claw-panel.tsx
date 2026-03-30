"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shell,
  Wand2,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import dynamic from "next/dynamic";

const CharacterViewer = dynamic(
  () =>
    import("@/components/dashboard/vrm-viewer").then((m) => m.CharacterViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] rounded-md bg-muted/30 animate-pulse" />
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

export function ClawPanel() {
  const t = useT();
  const [clawSkills, setClawSkills] = useState<InstalledSkill[]>([]);
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({ name: "", description: "" });

  const fetchClawSkills = useCallback(async () => {
    try {
      const connectRes = await fetch("/api/claw/connections");
      const connectData = await connectRes.json();
      const connections = connectData.connections ?? [];
      if (connections.length === 0) return;

      const connId = connections[0]?.id;
      if (!connId) return;

      const res = await fetch(
        `/api/claw/skills/installed?connectionId=${encodeURIComponent(connId)}`
      );
      const data = await res.json();
      if (!data.error) setClawSkills(data.skills ?? []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/jobs");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchClawSkills();
    fetchJobs();
  }, [fetchClawSkills, fetchJobs]);

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
      await fetchJobs();
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
      await fetchJobs();
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
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <CharacterViewer
          type="lobster"
          className="h-[300px] rounded-lg bg-gradient-to-b from-red-950/10 to-red-950/30 overflow-hidden"
        />

        {/* Lobster Skills (from installed claw skills) */}
        <div>
          <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            {t("dashboard.game.clawPanel.skills")}
          </h3>
          <ScrollArea className="max-h-[120px]">
            <div className="space-y-0.5">
              {clawSkills.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  {t("dashboard.game.clawPanel.noSkills")}
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

        {/* Assigned Jobs */}
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
