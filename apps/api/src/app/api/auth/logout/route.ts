import { logoutSchema } from "@simpledir/shared";
import { revokeRefreshToken } from "@/lib/auth";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin);
  }

  await revokeRefreshToken(parsed.data.refreshToken);
  return json({ ok: true }, { origin });
});
