"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useTodoSource, usePlansByLinkedNodes } from "@/lib/swr/hooks";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import type { MindMapTodo } from "@/lib/modules/todos/types";
import type { PlanPage } from "@/lib/modules/plans/types";
import { useClawDM } from "@/components/plans/claw/use-claw-dm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (planIds: string[]) => void;
}

interface ClawDraft {
  linkedNodeId: string;
  title: string;
  markdownDraft: string;
}

type RowStatus =
  | { kind: "idle" }
  | { kind: "drafting" }
  | { kind: "saving" }
  | { kind: "done"; planId: string }
  | { kind: "error"; message: string };

const blockNoteSchema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

/**
 * Pull the first ```json … ``` fenced block out of an LLM reply. Falls back
 * to the entire body if no fence was used. Tolerant of stray prose around
 * the JSON block.
 */
function extractJsonPayload(raw: string): string | null {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return trimmed;
  return null;
}

function buildPrompt(
  todos: MindMapTodo[],
  existing: Record<string, PlanPage>,
): string {
  const lines: string[] = [];
  lines.push(
    "You are drafting actionable plan pages for the user, one per todo.",
  );
  lines.push(
    "For each todo below, return a concise plan in Markdown that includes:",
  );
  lines.push("- A short paragraph framing the goal.");
  lines.push("- A '## Action steps' section with 3-7 checklist items.");
  lines.push(
    "- A '## Notes' section with anything the user should remember (skip if not useful).",
  );
  lines.push("");
  lines.push(
    "Respond with ONLY a single JSON array wrapped in a ```json fenced block. No prose outside the fence.",
  );
  lines.push(
    'Each entry must have exactly these keys: { "linkedNodeId": string, "title": string, "markdownDraft": string }.',
  );
  lines.push(
    "Echo each todo's id verbatim into linkedNodeId so the user's app can reconcile.",
  );
  lines.push("");
  lines.push("Todos:");
  for (const todo of todos) {
    const existingPlan = existing[todo.id];
    const breadcrumbs = todo.trace.length > 0 ? todo.trace.join(" > ") : "(no trace)";
    const urgency = todo.isUrgent ? " [URGENT]" : "";
    const refresh = existingPlan
      ? `  (Existing plan title: "${existingPlan.title}". Refresh and improve it.)`
      : "";
    lines.push(
      `- id=${todo.id} | title="${todo.title}"${urgency} | trace=${breadcrumbs}${refresh}`,
    );
  }
  return lines.join("\n");
}

export function GenerateFromTodosDialog({
  open,
  onOpenChange,
  onGenerated,
}: Props) {
  const t = useT();
  const { send, response, loading, error, reset, connected } = useClawDM();
  const markdownEditor = useCreateBlockNote({ schema: blockNoteSchema });

  const { data: scene } = useTodoSource();
  const todos: MindMapTodo[] = useMemo(() => {
    if (!scene) return [];
    let elements: unknown[] = [];
    try {
      elements = JSON.parse(scene.elements);
    } catch {
      return [];
    }
    return parseMindMapTodos(
      elements as Parameters<typeof parseMindMapTodos>[0],
    );
  }, [scene]);

  const todoIds = useMemo(() => todos.map((td) => td.id), [todos]);
  const { data: linkedData } = usePlansByLinkedNodes(todoIds);
  const linkedByNode: Record<string, PlanPage> = useMemo(
    () => linkedData?.byNode ?? {},
    [linkedData],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setStatuses({});
      setPhase("idle");
      reset();
    }
  }, [open, reset]);

  const allSelected = todos.length > 0 && selected.size === todos.length;
  const anySelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(todoIds));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const persistDrafts = async (drafts: ClawDraft[]) => {
    const createdIds: string[] = [];
    for (const draft of drafts) {
      const todo = todos.find((td) => td.id === draft.linkedNodeId);
      if (!todo) continue;

      setStatuses((prev) => ({
        ...prev,
        [draft.linkedNodeId]: { kind: "saving" },
      }));

      let blocks: unknown = undefined;
      try {
        const parsed = await markdownEditor.tryParseMarkdownToBlocks(
          draft.markdownDraft ?? "",
        );
        blocks = parsed;
      } catch {
        blocks = undefined;
      }

      const existingPlan = linkedByNode[draft.linkedNodeId];
      try {
        if (existingPlan) {
          const res = await fetch("/api/plans", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingPlan.id,
              title: draft.title || existingPlan.title,
              content: blocks,
              linkedNodeId: draft.linkedNodeId,
            }),
          });
          if (!res.ok) throw new Error(`Update failed (${res.status})`);
          createdIds.push(existingPlan.id);
          setStatuses((prev) => ({
            ...prev,
            [draft.linkedNodeId]: { kind: "done", planId: existingPlan.id },
          }));
        } else {
          const res = await fetch("/api/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: draft.title || todo.title,
              content: blocks,
              linkedNodeId: draft.linkedNodeId,
            }),
          });
          if (!res.ok) throw new Error(`Create failed (${res.status})`);
          const plan = (await res.json()) as { id: string };
          createdIds.push(plan.id);
          setStatuses((prev) => ({
            ...prev,
            [draft.linkedNodeId]: { kind: "done", planId: plan.id },
          }));
        }
      } catch (err) {
        setStatuses((prev) => ({
          ...prev,
          [draft.linkedNodeId]: {
            kind: "error",
            message: err instanceof Error ? err.message : "Save failed",
          },
        }));
      }
    }
    return createdIds;
  };

  const handleGenerate = async () => {
    if (!anySelected || phase === "running") return;
    if (!connected) {
      toast.error(t("plans.generateFromTodos.notConnected"));
      return;
    }

    const picked = todos.filter((td) => selected.has(td.id));
    const initialStatuses: Record<string, RowStatus> = {};
    for (const todo of picked) initialStatuses[todo.id] = { kind: "drafting" };
    setStatuses(initialStatuses);
    setPhase("running");

    await send(buildPrompt(picked, linkedByNode));
  };

  // Once Claw replies, parse + persist.
  useEffect(() => {
    if (phase !== "running" || !response || loading) return;

    const payload = extractJsonPayload(response);
    if (!payload) {
      toast.error(t("plans.generateFromTodos.parseFailed"));
      setPhase("done");
      return;
    }
    let drafts: ClawDraft[];
    try {
      const parsed = JSON.parse(payload);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      drafts = parsed
        .filter(
          (entry): entry is ClawDraft =>
            typeof entry?.linkedNodeId === "string" &&
            typeof entry?.title === "string" &&
            typeof entry?.markdownDraft === "string",
        )
        .filter((entry) => selected.has(entry.linkedNodeId));
    } catch {
      toast.error(t("plans.generateFromTodos.parseFailed"));
      setPhase("done");
      return;
    }

    void (async () => {
      const ids = await persistDrafts(drafts);
      onGenerated(ids);
      setPhase("done");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, loading, phase]);

  // Surface DM transport errors to row state.
  useEffect(() => {
    if (phase === "running" && error) {
      setStatuses((prev) => {
        const next = { ...prev };
        for (const id of selected) {
          if (next[id]?.kind === "drafting" || next[id]?.kind === "saving") {
            next[id] = { kind: "error", message: error };
          }
        }
        return next;
      });
      setPhase("done");
    }
  }, [error, phase, selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("plans.generateFromTodos.title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("plans.generateFromTodos.description")}
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between border-b pb-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            disabled={todos.length === 0 || phase === "running"}
          >
            {allSelected
              ? t("plans.generateFromTodos.deselectAll")
              : t("plans.generateFromTodos.selectAll")}
          </button>
          <span className="text-xs text-muted-foreground">
            {selected.size} / {todos.length}
          </span>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {todos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("plans.generateFromTodos.empty")}
            </p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {todos.map((todo) => {
                const status = statuses[todo.id] ?? { kind: "idle" };
                const existing = linkedByNode[todo.id];
                const traceWithoutTitle = todo.trace.slice(0, -1);
                return (
                  <li
                    key={todo.id}
                    className={cn(
                      "rounded-md border px-3 py-2 transition-colors",
                      selected.has(todo.id) && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(todo.id)}
                        onChange={() => toggleOne(todo.id)}
                        disabled={phase === "running"}
                        className="h-4 w-4 mt-0.5 shrink-0 rounded border accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {todo.title}
                          </span>
                          {todo.isUrgent && (
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                        </div>
                        {traceWithoutTitle.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            {traceWithoutTitle.map((segment, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && (
                                  <ChevronRight className="h-3 w-3 shrink-0" />
                                )}
                                <span className="truncate">{segment}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {existing
                            ? `${t("plans.generateFromTodos.willUpdate")} "${existing.title}"`
                            : t("plans.generateFromTodos.willCreate")}
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {phase === "done"
              ? t("common.close")
              : t("common.cancel")}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!anySelected || phase === "running" || !connected}
          >
            {phase === "running" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {t("plans.generateFromTodos.generating")}
              </>
            ) : (
              t("plans.generateFromTodos.generate")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const t = useT();
  switch (status.kind) {
    case "drafting":
      return (
        <span className="text-xs flex items-center gap-1 text-muted-foreground shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("plans.generateFromTodos.statusDrafting")}
        </span>
      );
    case "saving":
      return (
        <span className="text-xs flex items-center gap-1 text-muted-foreground shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("plans.generateFromTodos.statusSaving")}
        </span>
      );
    case "done":
      return (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
          {t("plans.generateFromTodos.statusDone")}
        </span>
      );
    case "error":
      return (
        <span
          className="text-xs text-destructive shrink-0"
          title={status.message}
        >
          {t("plans.generateFromTodos.statusError")}
        </span>
      );
    default:
      return null;
  }
}
