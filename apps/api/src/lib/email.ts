import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getAppUrl, getEmailFrom } from "./env";

function verificationHtml(verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Welcome to SimpleDir</h2>
      <p>Click the button below to verify your email and activate your account.</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none;">
          Verify email
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Or open this link:<br/>${verifyUrl}</p>
      <p style="color:#666;font-size:12px;">This link expires in 24 hours.</p>
    </div>
  `;
}

async function sendViaSmtp(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT ?? "1025");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: true,
    auth: user ? { user, pass: pass ?? "" } : undefined,
  });

  await transporter.sendMail({
    from: getEmailFrom(),
    to,
    subject,
    html,
  });
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/verify?token=${encodeURIComponent(token)}`;
  const subject = "Verify your SimpleDir account";
  const html = verificationHtml(verifyUrl);

  // Prefer SMTP (MailHog locally) when configured
  if (process.env.SMTP_HOST) {
    await sendViaSmtp(email, subject, html);
    console.info(`[email] sent via SMTP to ${email}`);
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(email, subject, html);
    return;
  }

  console.warn(
    "[email] No SMTP_HOST or RESEND_API_KEY — verification link:",
    verifyUrl,
  );
}
