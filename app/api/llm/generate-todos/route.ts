import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { structuredOutput } from "@/lib/core/llm-client";
import { getAllNodes } from "@/lib/modules/mind-map/actions";
import { getAllTodos } from "@/lib/modules/todos/actions";
import { getAllGoals } from "@/lib/modules/goals/actions";
import { getAllHabits } from "@/lib/modules/habits/actions";
import { buildTodoGenerationPrompt } from "@/lib/modules/todos/prompts";
import type { TodoSuggestion } from "@/lib/modules/todos/types";

export async function POST() {
  bootApp();
  try {
    const nodes = getAllNodes();
    const existingTodos = getAllTodos();
    const goals = getAllGoals();
    const habits = getAllHabits();

    const prompt = buildTodoGenerationPrompt({
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        metadata: n.metadata ?? {},
      })),
      existingTodos: existingTodos.map((t) => ({
        title: t.title,
        completed: t.completed,
      })),
      goals: goals.map((g) => ({
        title: g.title,
        progress: g.progress,
        targetDate: g.targetDate,
      })),
      habits: habits.map((h) => ({
        name: h.name,
        frequency: h.frequency,
        recentCompletions: h.completions.length,
      })),
    });

    const result = await structuredOutput<{ suggestions: TodoSuggestion[] } | TodoSuggestion[]>(
      [
        {
          role: "system",
          content:
            "You are a personal productivity assistant. Return valid JSON with a 'suggestions' key containing an array of todo suggestions.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.7, maxTokens: 4096 }
    );

    const suggestions = Array.isArray(result) ? result : result.suggestions ?? [];

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("API key") || message.includes("not configured") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
