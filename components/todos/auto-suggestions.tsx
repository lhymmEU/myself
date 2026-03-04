"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, Check, X, AlertCircle } from "lucide-react";
import type { TodoSuggestion } from "@/lib/modules/todos/types";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

interface AutoSuggestionsProps {
  onTodoCreated: () => void;
}

export function AutoSuggestions({ onTodoCreated }: AutoSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TodoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<Set<number>>(new Set());

  async function generate() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/llm/generate-todos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      setSuggestions(data.suggestions ?? []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to generate todos"
      );
    } finally {
      setLoading(false);
    }
  }

  async function acceptSuggestion(index: number) {
    const s = suggestions[index];
    setAccepting((prev) => new Set(prev).add(index));
    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: s.title,
          description: s.description,
          priority: s.priority,
          linkedNodeId: s.linkedNodeId,
          source: "auto",
          llmReasoning: s.reasoning,
        }),
      });
      setSuggestions((prev) => prev.filter((_, i) => i !== index));
      onTodoCreated();
    } finally {
      setAccepting((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  function rejectSuggestion(index: number) {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function acceptAll() {
    const indices = suggestions.map((_, i) => i);
    for (const i of indices.reverse()) {
      await acceptSuggestion(i);
    }
  }

  function dismissAll() {
    setSuggestions([]);
  }

  const isApiKeyError = error?.includes("API key");

  if (error && isApiKeyError) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">API Key Required</p>
        <p className="text-xs text-muted-foreground mb-3">
          Configure your OpenRouter API key in Settings to use AI-generated
          todos.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/settings">Go to Settings</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.length === 0 && !loading && (
        <div className="text-center py-8">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">
            AI will analyze your goals, habits, and mind map to suggest
            actionable todos
          </p>
          <Button onClick={generate} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Todos
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Analyzing your data and generating suggestions...
          </p>
        </div>
      )}

      {error && !isApiKeyError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={generate}>
            Retry
          </Button>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {suggestions.length} suggestion
              {suggestions.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={dismissAll}>
                Dismiss All
              </Button>
              <Button size="sm" onClick={acceptAll}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Accept All
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <Card key={`${s.title}-${i}`} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{s.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 border-0 shrink-0",
                          PRIORITY_COLORS[s.priority]
                        )}
                      >
                        {s.priority}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {s.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      {s.reasoning}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      onClick={() => acceptSuggestion(i)}
                      disabled={accepting.has(i)}
                    >
                      {accepting.has(i) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => rejectSuggestion(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={loading}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Regenerate
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
