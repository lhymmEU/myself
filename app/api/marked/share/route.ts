import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getCollection,
  listItems,
  encodeCollectionPayload,
} from "@/lib/modules/marked/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const collectionId = req.nextUrl.searchParams.get("collectionId");
    if (!collectionId)
      return NextResponse.json(
        { error: "Missing collectionId" },
        { status: 400 },
      );

    const collection = await getCollection(collectionId, userId);
    if (!collection)
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );

    const items = await listItems(collectionId, userId);
    const payload = encodeCollectionPayload(collection, items);

    return NextResponse.json({ collection, items, payload });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
