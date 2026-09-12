import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getAppUrl, getEmailFrom } from "./env";

function buttonHtml(label: string, url: string): string {
  return `
    <p>
      <a href="${url}"
         style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none;">
        ${label}
      </a>
    </p>
    <p style="color:#666;font-size:12px;">Or open this link:<br/>${url}</p>
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
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function sendEmail(to: string, subject: string, html: string, fallbackUrl: string) {
  if (process.env.SMTP_HOST) {
    await sendViaSmtp(to, subject, html);
    console.info(`[email] sent via SMTP to ${to}`);
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
    return;
  }

  console.warn(`[email] No SMTP_HOST or RESEND_API_KEY — link:`, fallbackUrl);
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/verify?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Welcome to SimpleDir</h2>
      <p>Click the button below to verify your email and activate your account.</p>
      ${buttonHtml("Verify email", verifyUrl)}
      <p style="color:#666;font-size:12px;">This link expires in 24 hours.</p>
    </div>
  `;
  await sendEmail(email, "Verify your SimpleDir account", html, verifyUrl);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Reset your SimpleDir password</h2>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      ${buttonHtml("Reset password", resetUrl)}
      <p style="color:#666;font-size:12px;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
  `;
  await sendEmail(email, "Reset your SimpleDir password", html, resetUrl);
}
