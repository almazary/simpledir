import { and, eq } from "drizzle-orm";
import {
  updateCredentialSchema,
  type CredentialSecrets,
  type CredentialSummary,
} from "@simpledir/shared";
import { getDb } from "@/db";
import { r2Credentials } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { error, json, readJson } from "@/lib/http";
import {
  normalizeR2Keys,
  r2Endpoint,
  testR2Connection,
} from "@/lib/r2";
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

function toSecrets(row: typeof r2Credentials.$inferSelect): CredentialSecrets {
  return {
    ...toSummary(row),
    accessKeyId: decryptSecret(row.accessKeyIdEnc),
    secretAccessKey: decryptSecret(row.secretAccessKeyEnc),
  };
}

async function findOwned(userId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(r2Credentials)
    .where(and(eq(r2Credentials.id, id), eq(r2Credentials.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export const GET = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const row = await findOwned(authResult.auth.userId, id);
  if (!row) {
    return error("Credential not found", 404, origin);
  }

  return json({ credential: toSecrets(row) }, { origin });
});

export const PATCH = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const existing = await findOwned(authResult.auth.userId, id);
  if (!existing) {
    return error("Credential not found", 404, origin);
  }

  const body = await readJson<unknown>(req);
  const parsed = updateCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const db = getDb();

  if (data.label && data.label !== existing.label) {
    const clash = await db
      .select({ id: r2Credentials.id })
      .from(r2Credentials)
      .where(
        and(
          eq(r2Credentials.userId, authResult.auth.userId),
          eq(r2Credentials.label, data.label),
        ),
      )
      .limit(1);
    if (clash[0]) {
      return error("Label already exists", 409, origin);
    }
  }

  const accountId = data.accountId ?? existing.accountId;
  const bucket = data.bucket ?? existing.bucket;
  const endpoint = r2Endpoint(
    accountId,
    data.endpoint !== undefined ? data.endpoint : existing.endpoint,
  );

  const rawAccess =
    data.accessKeyId?.trim() || decryptSecret(existing.accessKeyIdEnc);
  const rawSecret =
    data.secretAccessKey?.trim() || decryptSecret(existing.secretAccessKeyEnc);
  const keys = normalizeR2Keys(rawAccess, rawSecret);

  try {
    await testR2Connection({
      accountId,
      bucket,
      endpoint,
      accessKeyId: keys.accessKeyId,
      secretAccessKey: keys.secretAccessKey,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "R2 connection test failed";
    return error(message, 400, origin, { code: "R2_CONNECTION_FAILED" });
  }

  const updated = await db
    .update(r2Credentials)
    .set({
      label: data.label ?? existing.label,
      accountId,
      bucket,
      endpoint,
      accessKeyIdEnc: encryptSecret(keys.accessKeyId),
      secretAccessKeyEnc: encryptSecret(keys.secretAccessKey),
      updatedAt: new Date(),
    })
    .where(eq(r2Credentials.id, id))
    .returning();

  const row = updated[0];
  if (!row) {
    return error("Failed to update credential", 500, origin);
  }

  return json(
    { credential: toSummary(row), swapped: keys.swapped },
    { origin },
  );
});

export const DELETE = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const existing = await findOwned(authResult.auth.userId, id);
  if (!existing) {
    return error("Credential not found", 404, origin);
  }

  const db = getDb();
  await db.delete(r2Credentials).where(eq(r2Credentials.id, id));
  return json({ ok: true }, { origin });
});
