import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SIGNATURE_TEXT = `

---
KeyFlow CRM by Rain Design Labs
https://raindesignlabs.net
(360) 306-7579
`;

const SIGNATURE_HTML = `
<br>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
<table style="font-size:13px;color:#6b7280;font-family:Arial,sans-serif;">
  <tr>
    <td>
      <strong style="color:#111827;">KeyFlow CRM</strong> by Rain Design Labs<br>
      <a href="https://raindesignlabs.net" style="color:#2563eb;text-decoration:none;">raindesignlabs.net</a><br>
      (360) 306-7579
    </td>
  </tr>
</table>
`;

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  const from = process.env.SMTP_FROM || "KeyFlow <assistant@raindesignlabs.net>";

  const textWithSig = text + SIGNATURE_TEXT;
  const htmlWithSig = html
    ? html + SIGNATURE_HTML
    : text.replace(/\n/g, "<br>") + SIGNATURE_HTML;

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text: textWithSig,
    html: htmlWithSig,
  });

  return result;
}
