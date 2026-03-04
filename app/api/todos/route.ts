import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { bootApp } from "@/lib/core/init";
import { getDb } from "@/lib/core/db";
import { todos as todosTable } from "@/lib/modules/todos/schema";
import {
  getAllTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
} from "@/lib/modules/todos/actions";

export async function GET() {
  bootApp();
  try {
    const todos = getAllTodos();
    return NextResponse.json(todos);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const todo = createTodo({
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate,
      linkedNodeId: body.linkedNodeId,
    });

    if (body.source === "auto") {
      const db = getDb();
      const updates: Record<string, string> = { source: "auto" };
      if (body.llmReasoning) updates.llm_reasoning = body.llmReasoning;
      db.update(todosTable)
        .set({
          source: "auto",
          llmReasoning: body.llmReasoning ?? null,
        })
        .where(eq(todosTable.id, todo.id))
        .run();

      return NextResponse.json({
        ...todo,
        source: "auto" as const,
        llmReasoning: body.llmReasoning,
      });
    }

    return NextResponse.json(todo);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const todo = updateTodo(body);
    return NextResponse.json(todo);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    deleteTodo(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    if (body.action === "toggle") {
      const todo = toggleTodo(body.id);
      return NextResponse.json(todo);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
