import { and, eq, isNull } from "drizzle-orm";
import { resetPasswordSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { passwordResetTokens, refreshTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  const db = getDb();
  const tokenHash = hashToken(parsed.data.token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return error("Invalid or expired reset token", 400, origin);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  // Revoke existing sessions
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)),
    );

  return json(
    { message: "Password updated. You can sign in with your new password." },
    { origin },
  );
});
