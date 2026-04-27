import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getMailer } from "@/lib/core/mailer";
import { requireUserId } from "@/lib/core/route-helpers";
import { getInvoice, markInvoiceStatus } from "@/lib/modules/invoice/actions";

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const body = await req.json();
    const { invoiceId, pdfBase64, recipientEmail } = body;

    if (!invoiceId || !pdfBase64) {
      return NextResponse.json(
        { error: "Missing invoiceId or pdfBase64" },
        { status: 400 },
      );
    }

    const invoice = await getInvoice(invoiceId, userId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const toEmail = recipientEmail || invoice.client?.email;
    if (!toEmail) {
      return NextResponse.json(
        { error: "No recipient email address" },
        { status: 400 },
      );
    }

    const senderName = invoice.senderName || "Invoice";
    const subject = `Invoice ${invoice.invoiceNumber} from ${senderName}`;
    const text = `Please find attached invoice ${invoice.invoiceNumber}.\n\nTotal: ${invoice.currency} ${invoice.total.toFixed(2)}\nDue: ${invoice.dueDate || "Upon receipt"}\n\n${invoice.paymentInfo || ""}`;
    const html = `<p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>.</p>
<p>Total: <strong>${invoice.currency} ${invoice.total.toFixed(2)}</strong><br/>Due: ${invoice.dueDate || "Upon receipt"}</p>
${invoice.paymentInfo ? `<p>${invoice.paymentInfo}</p>` : ""}`;

    const mailer = getMailer(userId);
    await mailer.send({
      to: toEmail,
      subject,
      text,
      html,
      fromName: senderName,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    await markInvoiceStatus(invoiceId, "sent", userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 },
    );
  }
}
