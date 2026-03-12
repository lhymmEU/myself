import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceStatus,
  getNextInvoiceNumber,
  getAllClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getAllSignatures,
  createSignature,
  setDefaultSignature,
  deleteSignature,
} from "@/lib/modules/invoice/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    const id = req.nextUrl.searchParams.get("id");

    if (action === "clients") {
      return NextResponse.json(await getAllClients());
    }
    if (action === "client" && id) {
      const client = await getClient(id);
      if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      return NextResponse.json(client);
    }
    if (action === "signatures") {
      return NextResponse.json(await getAllSignatures());
    }
    if (action === "nextNumber") {
      return NextResponse.json({ number: await getNextInvoiceNumber() });
    }
    if (action === "detail" && id) {
      const invoice = await getInvoice(id);
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      return NextResponse.json(invoice);
    }

    return NextResponse.json(await getAllInvoices());
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
    const entity = body.entity;

    if (entity === "client") {
      const client = await createClient(body.data);
      return NextResponse.json(client);
    }
    if (entity === "signature") {
      const sig = await createSignature(body.data);
      return NextResponse.json(sig);
    }

    const invoice = await createInvoice(body);
    return NextResponse.json(invoice);
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
    const entity = body.entity;

    if (entity === "client") {
      const client = await updateClient(body.data);
      return NextResponse.json(client);
    }
    if (entity === "signatureDefault") {
      await setDefaultSignature(body.id);
      return NextResponse.json({ success: true });
    }
    if (entity === "status") {
      await markInvoiceStatus(body.id, body.status);
      return NextResponse.json({ success: true });
    }

    const invoice = await updateInvoice(body);
    return NextResponse.json(invoice);
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
    const entity = req.nextUrl.searchParams.get("entity");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (entity === "client") {
      await deleteClient(id);
    } else if (entity === "signature") {
      await deleteSignature(id);
    } else {
      await deleteInvoice(id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
