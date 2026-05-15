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

export function getMailer(_userId?: string): Mailer {
  return new ResendMailer();
}
