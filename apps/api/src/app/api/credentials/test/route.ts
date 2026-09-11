import { testCredentialSchema } from "@simpledir/shared";
import { requireAuth } from "@/lib/auth";
import { error, json, readJson } from "@/lib/http";
import { testR2Connection } from "@/lib/r2";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

export const POST = withHandler(async (req) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const body = await readJson<unknown>(req);
  const parsed = testCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid input", 400, origin, {
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await testR2Connection(parsed.data);
    const parts = [
      `Connected to bucket “${parsed.data.bucket}”`,
      `(${result.objectCount} object(s) sampled)`,
    ];
    if (result.swapped) {
      parts.push(
        "Note: Access Key and Secret looked swapped — normalized automatically.",
      );
    }
    if (result.corsApplied) {
      parts.push("Bucket CORS updated for desktop access.");
    } else if (result.corsError) {
      parts.push(
        `CORS not updated (${result.corsError}). Object browser may still need CORS on the bucket.`,
      );
    }

    return json(
      {
        ok: true as const,
        endpoint: result.endpoint,
        swapped: result.swapped,
        corsApplied: result.corsApplied,
        corsError: result.corsError,
        objectCount: result.objectCount,
        message: parts.join(" "),
      },
      { origin },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "R2 connection test failed";
    return error(message, 400, origin, { code: "R2_CONNECTION_FAILED" });
  }
});
