import { eq } from "drizzle-orm";
import { registerSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { hashPassword, toUserPublic } from "@/lib/auth";
import { hashToken, randomToken } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/email";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password, name } = parsed.data;
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return error("Email already registered", 409, origin);
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: name?.trim() || email.split("@")[0] || null,
    })
    .returning();

  const user = inserted[0];
  if (!user) {
    return error("Failed to create user", 500, origin);
  }

  const token = randomToken(32);
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  try {
    await sendVerificationEmail(email, token);
  } catch (err) {
    console.error(err);
    return error(
      "Account created but failed to send verification email",
      502,
      origin,
      { user: toUserPublic(user) },
    );
  }

  return json(
    {
      user: toUserPublic(user),
      message: "Check your email to verify your account",
    },
    { status: 201, origin },
  );
});
