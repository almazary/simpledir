import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { r2Credentials } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { createR2Client, type R2ConnInput } from "@/lib/r2";

export async function getOwnedCredential(userId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(r2Credentials)
    .where(and(eq(r2Credentials.id, id), eq(r2Credentials.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export function credentialToConn(
  row: typeof r2Credentials.$inferSelect,
): R2ConnInput {
  return {
    accountId: row.accountId,
    bucket: row.bucket,
    endpoint: row.endpoint,
    accessKeyId: decryptSecret(row.accessKeyIdEnc),
    secretAccessKey: decryptSecret(row.secretAccessKeyEnc),
  };
}

export function clientFromCredential(row: typeof r2Credentials.$inferSelect) {
  return createR2Client(credentialToConn(row));
}
