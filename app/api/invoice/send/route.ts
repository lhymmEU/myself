import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import nodemailer from "nodemailer";
import { getInvoice, markInvoiceStatus } from "@/lib/modules/invoice/actions";
import { getSetting } from "@/lib/modules/settings/actions";

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const { invoiceId, pdfBase64, recipientEmail } = body;

    if (!invoiceId || !pdfBase64) {
      return NextResponse.json({ error: "Missing invoiceId or pdfBase64" }, { status: 400 });
    }

    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const smtpHost = getSetting("smtp_host");
    const smtpPort = getSetting("smtp_port");
    const smtpUser = getSetting("smtp_user");
    const smtpPass = getSetting("smtp_pass");
    const smtpSecure = getSetting("smtp_secure");

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "SMTP not configured. Go to Settings to set up email." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587", 10),
      secure: smtpSecure === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });

    const toEmail = recipientEmail || invoice.client?.email;
    if (!toEmail) {
      return NextResponse.json({ error: "No recipient email address" }, { status: 400 });
    }

    const senderName = invoice.senderName || "Invoice";
    const subject = `Invoice ${invoice.invoiceNumber} from ${senderName}`;

    await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to: toEmail,
      subject,
      text: `Please find attached invoice ${invoice.invoiceNumber}.\n\nTotal: ${invoice.currency} ${invoice.total.toFixed(2)}\nDue: ${invoice.dueDate || "Upon receipt"}\n\n${invoice.paymentInfo || ""}`,
      html: `<p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>.</p>
<p>Total: <strong>${invoice.currency} ${invoice.total.toFixed(2)}</strong><br/>Due: ${invoice.dueDate || "Upon receipt"}</p>
${invoice.paymentInfo ? `<p>${invoice.paymentInfo}</p>` : ""}`,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    await markInvoiceStatus(invoiceId, "sent");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
