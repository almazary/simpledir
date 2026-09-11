import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, toUserPublic } from "@/lib/auth";
import { error, json } from "@/lib/http";
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
