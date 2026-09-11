import { and, eq } from "drizzle-orm";
import {
  createCredentialSchema,
  type CredentialSummary,
} from "@simpledir/shared";
import { getDb } from "@/db";
import { r2Credentials } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { error, json, readJson } from "@/lib/http";
import { normalizeR2Keys, r2Endpoint, testR2Connection } from "@/lib/r2";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

function toSummary(row: typeof r2Credentials.$inferSelect): CredentialSummary {
  return {
    id: row.id,
    label: row.label,
    accountId: row.accountId,
    bucket: row.bucket,
    endpoint: row.endpoint,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(r2Credentials)
    .where(eq(r2Credentials.userId, authResult.auth.userId));

  return json({ credentials: rows.map(toSummary) }, { origin });
});

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const body = await readJson<unknown>(req);
  const parsed = createCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const keys = normalizeR2Keys(data.accessKeyId, data.secretAccessKey);
  const endpoint = r2Endpoint(data.accountId, data.endpoint);

  try {
    await testR2Connection({
      accountId: data.accountId,
      bucket: data.bucket,
      endpoint,
      accessKeyId: keys.accessKeyId,
      secretAccessKey: keys.secretAccessKey,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "R2 connection test failed";
    return error(message, 400, origin, { code: "R2_CONNECTION_FAILED" });
  }

  const db = getDb();

  const existing = await db
    .select({ id: r2Credentials.id })
    .from(r2Credentials)
    .where(
      and(
        eq(r2Credentials.userId, authResult.auth.userId),
        eq(r2Credentials.label, data.label),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return error("Label already exists", 409, origin);
  }

  const inserted = await db
    .insert(r2Credentials)
    .values({
      userId: authResult.auth.userId,
      label: data.label,
      accountId: data.accountId,
      bucket: data.bucket,
      endpoint,
      accessKeyIdEnc: encryptSecret(keys.accessKeyId),
      secretAccessKeyEnc: encryptSecret(keys.secretAccessKey),
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    return error("Failed to create credential", 500, origin);
  }

  return json(
    {
      credential: toSummary(row),
      swapped: keys.swapped,
    },
    { status: 201, origin },
  );
});
