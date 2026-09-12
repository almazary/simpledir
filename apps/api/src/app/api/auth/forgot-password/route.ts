import { eq } from "drizzle-orm";
import { forgotPasswordSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashToken, randomToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  // Always return the same message (don't leak whether email exists)
  const okMessage = {
    message: "If that email is registered, a reset link has been sent.",
  };

  if (!user || user.status === "disabled") {
    return json(okMessage, { origin });
  }

  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error(err);
    return error(
      err instanceof Error ? err.message : "Failed to send reset email",
      502,
      origin,
    );
  }

  return json(okMessage, { origin });
});
