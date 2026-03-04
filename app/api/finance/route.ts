import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllTransactions,
  createTransaction,
  deleteTransaction,
  getFinancialSummary,
  getAllBudgets,
  setBudget,
  deleteBudget,
} from "@/lib/modules/finance/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    if (action === "summary") {
      const summary = await getFinancialSummary();
      return NextResponse.json(summary);
    }
    if (action === "budgets") {
      const budgetList = await getAllBudgets();
      return NextResponse.json(budgetList);
    }
    const txns = await getAllTransactions();
    return NextResponse.json(txns);
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
    const txn = await createTransaction({
      type: body.type,
      amount: body.amount,
      category: body.category,
      description: body.description,
      date: body.date,
      recurring: body.recurring,
      tags: body.tags,
    });
    return NextResponse.json(txn);
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
    await deleteTransaction(id);
    return NextResponse.json({ success: true });
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
    if (body.action === "setBudget") {
      const budget = await setBudget(body.category, body.amount, body.period);
      return NextResponse.json(budget);
    }
    if (body.action === "deleteBudget") {
      await deleteBudget(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
