import { eq } from "drizzle-orm";
import { updateProfileSchema } from "@simpledir/shared";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  hashPassword,
  requireAuth,
  toUserPublic,
  verifyPassword,
} from "@/lib/auth";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const GET = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.auth.userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return error("User not found", 404, origin);
  }

  return json({ user: toUserPublic(user) }, { origin });
});

export const PATCH = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const body = await readJson<unknown>(req);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.auth.userId))
    .limit(1);
  const user = rows[0];
  if (!user) {
    return error("User not found", 404, origin);
  }

  const data = parsed.data;
  let passwordHash = user.passwordHash;

  if (data.newPassword) {
    const ok = await verifyPassword(
      data.currentPassword ?? "",
      user.passwordHash,
    );
    if (!ok) {
      return error("Current password is incorrect", 400, origin, {
        code: "INVALID_CURRENT_PASSWORD",
      });
    }
    passwordHash = await hashPassword(data.newPassword);
  }

  const updated = await db
    .update(users)
    .set({
      name: data.name !== undefined ? data.name : user.name,
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  const next = updated[0];
  if (!next) {
    return error("Failed to update profile", 500, origin);
  }

  return json(
    {
      user: toUserPublic(next),
      message: data.newPassword
        ? "Profile and password updated"
        : "Profile updated",
    },
    { origin },
  );
});
