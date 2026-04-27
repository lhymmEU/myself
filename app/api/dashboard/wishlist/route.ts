import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listWishlist,
  createWish,
  updateWish,
  deleteWish,
} from "@/lib/modules/dashboard/actions";

export async function GET() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const wishes = listWishlist(auth.userId);
    return NextResponse.json({ wishes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list wishlist" },
      { status: 500 }
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
        const result = createWish(body, auth.userId);
        return NextResponse.json(result);
      } catch (e) {
        if (e instanceof Error && e.message === "wishlist_full") {
          return NextResponse.json({ error: "wishlist_full" }, { status: 409 });
        }
        throw e;
      }
    }

    if (action === "update") {
      updateWish(body.id, body.data, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      deleteWish(body.id, auth.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
