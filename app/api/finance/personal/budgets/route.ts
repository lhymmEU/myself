import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  getBudgetSpending,
  updateBudget,
} from "@/lib/modules/finance/personal-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const yearStr = sp.get("year");
  const monthStr = sp.get("month");

  if (category && yearStr && monthStr) {
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 }
      );
    }
    const spending = getBudgetSpending(category, year, month);
    return NextResponse.json({ category, year, month, spending });
  }

  const result = getBudgets();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  const result = createBudget(body);
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();
  const { id, ...data } = body as { id: string } & Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  updateBudget(id, data);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteBudget(id);
  return NextResponse.json({ success: true });
}
