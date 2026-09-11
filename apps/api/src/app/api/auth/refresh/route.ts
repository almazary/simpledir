import { refreshSchema } from "@simpledir/shared";
import {
  rotateRefreshToken,
  signAccessToken,
  toUserPublic,
} from "@/lib/auth";
import { error, json, readJson } from "@/lib/http";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const body = await readJson<unknown>(req);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin);
  }

  const rotated = await rotateRefreshToken(parsed.data.refreshToken);
  if (!rotated) {
    return error("Invalid or expired refresh token", 401, origin);
  }

  if (rotated.user.status !== "active") {
    return error("Account is not active", 403, origin);
  }

  const { accessToken, expiresIn } = await signAccessToken(rotated.user);

  return json(
    {
      user: toUserPublic(rotated.user),
      accessToken,
      refreshToken: rotated.refreshToken,
      expiresIn,
    },
    { origin },
  );
});
