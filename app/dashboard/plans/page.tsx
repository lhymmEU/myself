"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageList } from "@/components/plans/page-list";
import { Editor } from "@/components/plans/editor";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";

interface Plan {
  id: string;
  title: string;
  content: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [title, setTitle] = useState("");
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/plans?action=list");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {
      // network error
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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

  const handleCreate = useCallback(async () => {
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (res.ok) {
        const plan = await res.json();
        await fetchPlans();
        setActiveId(plan.id);
        setActivePlan(plan);
        setTitle(plan.title);
      }
    } catch {
      // network error
    }
  }, [fetchPlans]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/plans?id=${id}`, { method: "DELETE" });
        if (activeId === id) {
          setActiveId(null);
          setActivePlan(null);
          setTitle("");
        }
        await fetchPlans();
      } catch {
        // network error
      }
    },
    [activeId, fetchPlans]
  );

  const handleContentChange = useCallback(
    async (content: Record<string, unknown>) => {
      if (!activeId) return;
      try {
        await fetch("/api/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeId, content }),
        });
        fetchPlans();
      } catch {
        // network error
      }
    },
    [activeId, fetchPlans]
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
          fetchPlans();
        } catch {
          // network error
        }
      }, 1000);
    },
    [activeId, fetchPlans]
  );

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="w-[250px] border-r shrink-0">
        <PageList
          plans={plans}
          activeId={activeId}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onCreate={handleCreate}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {activePlan ? (
          <>
            <div className="p-4 pb-2">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="border-none text-xl font-semibold h-auto p-0 shadow-none focus-visible:ring-0"
                placeholder="Untitled"
              />
            </div>
            <Separator />
            <div className="flex-1 min-h-0">
              <Editor
                key={activePlan.id}
                content={activePlan.content as Record<string, unknown>}
                onChange={handleContentChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-2">
              <FileText className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-lg">Select a page or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
