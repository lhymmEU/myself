import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from "@/lib/modules/finance/personal-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const sp = req.nextUrl.searchParams;
  const filters: NonNullable<Parameters<typeof getTransactions>[0]> = {};

  const accountId = sp.get("account_id");
  if (accountId) filters.account_id = accountId;

  const type = sp.get("type");
  if (type) filters.type = type;

  const category = sp.get("category");
  if (category) filters.category = category;

  const fromDate = sp.get("from_date");
  if (fromDate) filters.from_date = fromDate;

  const toDate = sp.get("to_date");
  if (toDate) filters.to_date = toDate;

  const limitStr = sp.get("limit");
  if (limitStr) {
    const n = parseInt(limitStr, 10);
    if (!Number.isNaN(n)) filters.limit = n;
  }

  const result = await getTransactions(filters, auth.userId);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const result = await createTransaction(body, auth.userId);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteTransaction(id, auth.userId);
  return NextResponse.json({ success: true });
}
