export function buildTodoGenerationPrompt(context: {
  nodes: { id: string; label: string; type: string; metadata: Record<string, unknown> }[];
  existingTodos: { title: string; completed: boolean }[];
  goals: { title: string; progress: number; targetDate: string }[];
  habits: { name: string; frequency: string; recentCompletions: number }[];
}): string {
  const nodesSection =
    context.nodes.length > 0
      ? `Mind map nodes:\n${context.nodes
          .map((n) => `- [${n.id}] ${n.label} (${n.type})`)
          .join("\n")}`
      : "No mind map nodes available.";

  const todosSection =
    context.existingTodos.length > 0
      ? `Existing todos:\n${context.existingTodos
          .map((t) => `- ${t.title}${t.completed ? " [completed]" : ""}`)
          .join("\n")}`
      : "No existing todos.";

  const goalsSection =
    context.goals.length > 0
      ? `Active goals:\n${context.goals
          .map((g) => `- ${g.title} (${g.progress}% progress, target: ${g.targetDate})`)
          .join("\n")}`
      : "No active goals.";

  const habitsSection =
    context.habits.length > 0
      ? `Habits:\n${context.habits
          .map((h) => `- ${h.name} (${h.frequency}, recent completions: ${h.recentCompletions})`)
          .join("\n")}`
      : "No habits tracked.";

  return `You are a personal productivity assistant. Based on the following context, generate actionable todo items that would help the user make progress.

${nodesSection}

${todosSection}

${goalsSection}

${habitsSection}

Generate 3-7 concrete, actionable todos. Avoid duplicating existing uncompleted todos. Prioritize items that align with goals and habits. When a todo relates to a mind map node, include its node ID as linkedNodeId.

Respond with a JSON array only, no other text. Each item must have: title (string), description (string, optional), priority ("low"|"medium"|"high"|"urgent"), reasoning (string explaining why this todo matters), and optionally linkedNodeId (string, node ID if applicable).

Example format:
[{"title":"Review project milestones","description":"Check progress against Q1 targets","priority":"high","reasoning":"Aligns with goal progress tracking","linkedNodeId":"abc123"},...]`;
}
