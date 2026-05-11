import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listUserWishes,
  deleteUserWish,
  updateUserWishPlanData,
} from "@/lib/modules/dashboard/actions";
import { parsePlanDataJson } from "@/lib/wishlist/parse-plan";

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const wishes = await listUserWishes(auth.userId);
    return NextResponse.json({ wishes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list wishes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "delete") {
      await deleteUserWish(body.id, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "patch-plan") {
      const id = body.id as string;
      const planData = body.planData as Record<string, string>;
      if (!id || !planData || typeof planData !== "object") {
        return NextResponse.json(
          { error: "id and planData required" },
          { status: 400 },
        );
      }
      const normalized = parsePlanDataJson(JSON.stringify(planData));
      await updateUserWishPlanData(id, normalized, auth.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
