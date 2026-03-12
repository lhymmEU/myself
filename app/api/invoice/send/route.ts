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

    // #region agent log
    const fs = await import("fs");
    const logEntry = (msg: string, data: Record<string, unknown>, hId: string) => { try { fs.appendFileSync("/Users/magicsheep/Portfolio/myself/.cursor/debug-b5bbb4.log", JSON.stringify({sessionId:"b5bbb4",location:"send/route.ts",message:msg,data,timestamp:Date.now(),hypothesisId:hId})+"\n"); } catch {} };
    logEntry("POST /api/invoice/send entered", {hasInvoiceId:!!invoiceId,hasPdfBase64:!!pdfBase64,pdfBase64Length:pdfBase64?.length,recipientEmail}, "H-C");
    // #endregion

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

    // #region agent log
    logEntry("SMTP settings loaded", {smtpHost,smtpPort,smtpUser,hasSmtpPass:!!smtpPass,smtpSecure}, "H-E");
    // #endregion

    if (!smtpHost || !smtpUser || !smtpPass) {
      // #region agent log
      logEntry("SMTP not configured - returning 400", {smtpHost,smtpUser,hasSmtpPass:!!smtpPass}, "H-C");
      // #endregion
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

    // #region agent log
    logEntry("Email sent successfully", {toEmail,subject}, "H-E");
    // #endregion
    await markInvoiceStatus(invoiceId, "sent");
    return NextResponse.json({ success: true });
  } catch (err) {
    // #region agent log
    logEntry("CAUGHT ERROR in send route", {error:err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined}, "H-E");
    // #endregion
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
