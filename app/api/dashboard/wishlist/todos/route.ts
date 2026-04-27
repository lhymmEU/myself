import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listWishTodos,
  createWishTodo,
  updateWishTodo,
  deleteWishTodo,
  bulkCreateWishTodos,
} from "@/lib/modules/dashboard/actions";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const wishId = req.nextUrl.searchParams.get("wishId");
    if (!wishId) {
      return NextResponse.json({ error: "wishId required" }, { status: 400 });
    }
    const todos = await listWishTodos(wishId, auth.userId);
    return NextResponse.json({ todos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list todos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      try {
        const result = await createWishTodo(body, auth.userId);
        return NextResponse.json(result);
      } catch (e) {
        if (e instanceof Error && e.message === "wish_todos_full") {
          return NextResponse.json({ error: "wish_todos_full" }, { status: 409 });
        }
        throw e;
      }
    }

    if (action === "update") {
      await updateWishTodo(body.id, body.data, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await deleteWishTodo(body.id, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "bulk-create") {
      const result = await bulkCreateWishTodos(body.wishId, body.contents, auth.userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
