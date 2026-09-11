import { and, eq, isNull } from "drizzle-orm";
import { verifyEmailSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { toUserPublic } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin);
  }

  const db = getDb();
  const tokenHash = hashToken(parsed.data.token);
  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return error("Invalid or expired verification token", 400, origin);
  }

  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, row.id));

  const updated = await db
    .update(users)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(users.id, row.userId))
    .returning();

  const user = updated[0];
  if (!user) {
    return error("User not found", 404, origin);
  }

  return json(
    { user: toUserPublic(user), message: "Email verified. You can log in." },
    { origin },
  );
});
