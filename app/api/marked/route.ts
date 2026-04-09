import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  moveItemToCollection,
  reorderItems,
  generateSourceTag,
} from "@/lib/modules/marked/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const entity = req.nextUrl.searchParams.get("entity");
    const id = req.nextUrl.searchParams.get("id");
    const collectionId = req.nextUrl.searchParams.get("collectionId");

    if (entity === "collection") {
      if (id) {
        const c = getCollection(id);
        if (!c)
          return NextResponse.json(
            { error: "Collection not found" },
            { status: 404 },
          );
        return NextResponse.json(c);
      }
      return NextResponse.json(listCollections());
    }

    if (entity === "item") {
      if (id) {
        const item = getItem(id);
        if (!item)
          return NextResponse.json(
            { error: "Item not found" },
            { status: 404 },
          );
        return NextResponse.json(item);
      }
      return NextResponse.json(listItems(collectionId));
    }

    return NextResponse.json({ error: "Missing entity param" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const entity = body.entity;

    if (entity === "collection") {
      const c = createCollection({ name: body.name, notes: body.notes });
      return NextResponse.json(c);
    }

    if (entity === "item") {
      const item = createItem({
        url: body.url,
        title: body.title,
        sourceTag: body.sourceTag ?? generateSourceTag(body.url, body.title),
        notes: body.notes,
        favicon: body.favicon,
        ogImage: body.ogImage,
        ogDescription: body.ogDescription,
        collectionId: body.collectionId,
      });
      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Missing entity" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const entity = body.entity;

    if (body.action === "reorder") {
      if (entity === "collection") {
        reorderCollections(body.ids);
      } else {
        reorderItems(body.ids);
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === "move") {
      moveItemToCollection(body.id, body.collectionId ?? null);
      return NextResponse.json({ success: true });
    }

    if (entity === "collection") {
      const c = updateCollection({
        id: body.id,
        name: body.name,
        notes: body.notes,
      });
      return NextResponse.json(c);
    }

    if (entity === "item") {
      const item = updateItem({
        id: body.id,
        url: body.url,
        title: body.title,
        sourceTag: body.sourceTag,
        notes: body.notes,
        favicon: body.favicon,
        ogImage: body.ogImage,
        ogDescription: body.ogDescription,
        collectionId: body.collectionId,
      });
      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Missing entity" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  try {
    const id = req.nextUrl.searchParams.get("id");
    const entity = req.nextUrl.searchParams.get("entity");
    if (!id)
      return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (entity === "collection") {
      deleteCollection(id);
    } else {
      deleteItem(id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}
