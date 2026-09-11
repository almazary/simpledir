function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getJwtSecret(): string {
  return required("JWT_SECRET");
}

export function getEncryptionKey(): Buffer {
  const raw = required("CREDENTIALS_ENCRYPTION_KEY");
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 32-byte hex (64 chars) or base64",
    );
  }
  return buf;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3001";
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "SimpleDir <onboarding@resend.dev>";
}

export function getCorsOrigin(): string {
  return process.env.CORS_ORIGIN ?? "*";
}
