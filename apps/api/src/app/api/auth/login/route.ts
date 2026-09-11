import { eq } from "drizzle-orm";
import { loginSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  issueRefreshToken,
  signAccessToken,
  toUserPublic,
  verifyPassword,
} from "@/lib/auth";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return error("Invalid email or password", 401, origin);
  }

  if (user.status === "pending_verification") {
    return error("Email not verified", 403, origin, { code: "EMAIL_NOT_VERIFIED" });
  }

  if (user.status === "disabled") {
    return error("Account disabled", 403, origin);
  }

  const { accessToken, expiresIn } = await signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return json(
    {
      user: toUserPublic(user),
      accessToken,
      refreshToken,
      expiresIn,
    },
    { origin },
  );
});
