import { error, optionsResponse } from "./http";

export function withOptions() {
  return function OPTIONS(req: Request) {
    return optionsResponse(req.headers.get("origin"));
  };
}

export function withHandler(
  handler: (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (
    req: Request,
    ctx?: { params: Promise<Record<string, string>> },
  ) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(err);
      const origin = req.headers.get("origin");
      const message =
        err instanceof Error ? err.message : "Internal server error";
      const isConfig =
        message.includes("is not set") ||
        message.includes("ENCRYPTION_KEY") ||
        message.includes("JWT_SECRET");
      return error(
        isConfig ? message : "Internal server error",
        isConfig ? 500 : 500,
        origin,
      );
    }
  };
}
