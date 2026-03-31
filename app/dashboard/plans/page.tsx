"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PageList } from "@/components/plans/page-list";
import type { PlanFolder } from "@/components/plans/page-list";
import { Editor } from "@/components/plans/editor";
import { FileText, PenLine, PanelLeft, PanelLeftClose } from "lucide-react";
import type { Block } from "@blocknote/core";
import { useT } from "@/lib/i18n/context";
import { usePlanList, usePlanFolders } from "@/lib/swr/hooks";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  title: string;
  content: Block[];
  folderId?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export default function PlansPage() {
  const t = useT();
  const { data: plansData, mutate: mutatePlans } = usePlanList();
  const { data: foldersData, mutate: mutateFolders } = usePlanFolders();
  const plans: Plan[] = useMemo(() => (Array.isArray(plansData) ? plansData : []), [plansData]);
  const folders: PlanFolder[] = useMemo(() => foldersData?.folders ?? [], [foldersData]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [title, setTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPlan = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/plans?id=${id}`);
      if (res.ok) {
        const plan = await res.json();
        setActivePlan(plan);
        setTitle(plan.title);
      }
    } catch {
      // network error
    }
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      loadPlan(id);
    },
    [loadPlan]
  );

  const handleCreate = useCallback(async (folderId?: string | null) => {
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", folderId: folderId ?? null }),
      });
      if (res.ok) {
        const plan = await res.json();
        await mutatePlans();
        setActiveId(plan.id);
        setActivePlan(plan);
        setTitle(plan.title);
      }
    } catch {
      // network error
    }
  }, [mutatePlans]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/plans?id=${id}`, { method: "DELETE" });
        if (activeId === id) {
          setActiveId(null);
          setActivePlan(null);
          setTitle("");
        }
        await mutatePlans();
      } catch {
        // network error
      }
    },
    [activeId, mutatePlans]
  );

  const handleContentChange = useCallback(
    async (content: Block[]) => {
      if (!activeId) return;
      try {
        await fetch("/api/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeId, content }),
        });
        mutatePlans();
      } catch {
        // network error
      }
    },
    [activeId, mutatePlans]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = setTimeout(async () => {
        if (!activeId) return;
        try {
          await fetch("/api/plans", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: activeId, title: newTitle }),
          });
          mutatePlans();
        } catch {
          // network error
        }
      }, 1000);
    },
    [activeId, mutatePlans]
  );

  const handleReorder = useCallback(
    async (ids: string[]) => {
      const reordered = ids.map((id) => plans.find((p) => p.id === id)!);
      mutatePlans(reordered, false);
      try {
        await fetch("/api/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reorder", ids }),
        });
      } catch {
        mutatePlans();
      }
    },
    [plans, mutatePlans]
  );

  const handleMovePlan = useCallback(
    async (planId: string, folderId: string | null) => {
      try {
        await fetch("/api/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: planId, folderId }),
        });
        await mutatePlans();
      } catch {
        // network error
      }
    },
    [mutatePlans]
  );

  const handleCreateFolder = useCallback(async () => {
    try {
      await fetch("/api/plans/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Folder" }),
      });
      await mutateFolders();
    } catch {
      // network error
    }
  }, [mutateFolders]);

  const handleRenameFolder = useCallback(
    async (id: string, name: string) => {
      try {
        await fetch("/api/plans/folders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name }),
        });
        await mutateFolders();
      } catch {
        // network error
      }
    },
    [mutateFolders]
  );

  const handleReorderFolders = useCallback(
    async (ids: string[]) => {
      const reordered = ids.map((id) => folders.find((f) => f.id === id)!).filter(Boolean);
      mutateFolders({ folders: reordered }, false);
      try {
        await fetch("/api/plans/folders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reorder", ids }),
        });
      } catch {
        mutateFolders();
      }
    },
    [folders, mutateFolders]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/plans/folders?id=${id}`, { method: "DELETE" });
        await mutateFolders();
        await mutatePlans();
      } catch {
        // network error
      }
    },
    [mutateFolders, mutatePlans]
  );

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div
        className={`shrink-0 bg-muted/30 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-[280px] border-r px-2" : "w-0"
        }`}
      >
        <div className="w-[260px] h-full">
          <PageList
            plans={plans}
            folders={folders}
            activeId={activeId}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onReorder={handleReorder}
            onMovePlan={handleMovePlan}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onReorderFolders={handleReorderFolders}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center h-10 px-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        {activePlan ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 pt-4 pb-24">
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 tracking-tight"
                placeholder={t("plans.untitled")}
              />
              <p className="mt-2 mb-6 text-sm text-muted-foreground">
                {t("plans.lastEdited")}{" "}
                {new Date(activePlan.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <Editor
                key={activePlan.id}
                content={activePlan.content as Block[]}
                onChange={handleContentChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-medium text-foreground/80">
                  {t("plans.noPageSelected")}
                </p>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  {t("plans.noPageSelectedDesc")}
                </p>
              </div>
              <button
                onClick={() => handleCreate()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PenLine className="h-4 w-4" />
                {t("plans.newPage")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
