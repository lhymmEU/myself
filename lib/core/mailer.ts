/**
 * Mailer abstraction.
 *
 * - Local mode: returns a `nodemailer` transport configured from the user's
 *   SMTP settings (Settings → SMTP). No external deps beyond what they
 *   already have.
 * - Cloud mode: returns a thin wrapper around the Resend HTTP API
 *   (`RESEND_API_KEY` env). Cloud users can't run their own SMTP server,
 *   and we don't want to ship their credentials to a hosted relay anyway.
 *
 * Callers should depend ONLY on the `Mailer.send()` interface so they can
 * stay mode-agnostic.
 */

import { isLocal } from "@/lib/core/runtime";
import { getSetting } from "@/lib/modules/settings/actions";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  attachments?: MailAttachment[];
}

export interface Mailer {
  send(input: SendMailInput): Promise<void>;
}

class NodemailerMailer implements Mailer {
  constructor(private userId: string) {}

  async send(input: SendMailInput): Promise<void> {
    const smtpHost = getSetting("smtp_host", this.userId);
    const smtpUser = getSetting("smtp_user", this.userId);
    const smtpPass = getSetting("smtp_pass", this.userId);
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        "SMTP not configured. Go to Settings → SMTP to set up email.",
      );
    }
    const smtpPort = getSetting("smtp_port", this.userId);
    const smtpSecure = getSetting("smtp_secure", this.userId);

    /* eslint-disable @typescript-eslint/no-require-imports */
    const nodemailer = require("nodemailer") as typeof import("nodemailer");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587", 10),
      secure: smtpSecure === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${input.fromName ?? smtpUser}" <${smtpUser}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
  }
}

class ResendMailer implements Mailer {
  async send(input: SendMailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromAddress) {
      throw new Error(
        "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
      );
    }

    /* eslint-disable @typescript-eslint/no-require-imports */
    const { Resend } = require("resend") as typeof import("resend");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const resend = new Resend(apiKey);

    const fromName = input.fromName ?? "Life Dashboard";
    const result = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [input.to],
      subject: input.subject,
      text: input.text ?? "",
      html: input.html ?? input.text ?? "",
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content.toString("base64"),
      })),
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }
  }
}

export function getMailer(userId: string): Mailer {
  return isLocal() ? new NodemailerMailer(userId) : new ResendMailer();
}
