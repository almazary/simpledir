import { error, optionsResponse } from "./http";

export type AppRouteContext = {
  params: Promise<Record<string, string>>;
};

export function withOptions() {
  return function OPTIONS(req: Request) {
    return optionsResponse(req.headers.get("origin"));
  };
}

export function withHandler(
  handler: (req: Request, ctx: AppRouteContext) => Promise<Response>,
) {
  return async (req: Request, ctx: AppRouteContext) => {
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
      return error(isConfig ? message : "Internal server error", 500, origin);
    }
  };
}
