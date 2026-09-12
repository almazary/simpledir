import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  clientFromCredential,
  getOwnedCredential,
} from "@/lib/credentials";
import { error, json, readJson } from "@/lib/http";
import {
  deleteR2Object,
  getR2ObjectBytes,
  listR2Entries,
  putR2Object,
  searchR2Objects,
  summarizePrefix,
} from "@/lib/r2";
import { withHandler, withOptions } from "@/lib/route";

export const OPTIONS = withOptions();

const deleteSchema = z.object({
  key: z.string().min(1).max(1024),
});

const folderSchema = z.object({
  prefix: z.string().max(1024).default(""),
  name: z.string().trim().min(1).max(255),
});

export const GET = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const row = await getOwnedCredential(authResult.auth.userId, id);
  if (!row) return error("Credential not found", 404, origin);

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? "";
  const downloadKey = url.searchParams.get("download");
  const wantStats = url.searchParams.get("stats") === "1";
  const search = url.searchParams.get("search")?.trim() ?? "";

  const { client } = clientFromCredential(row);

  if (downloadKey) {
    try {
      const obj = await getR2ObjectBytes(client, row.bucket, downloadKey);
      const filename = downloadKey.split("/").pop() || "download";
      return new Response(Buffer.from(obj.bytes), {
        status: 200,
        headers: {
          "Content-Type": obj.contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Access-Control-Allow-Origin": origin ?? "*",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      return error(message, 400, origin);
    }
  }

  if (wantStats) {
    try {
      const stats = await summarizePrefix(client, row.bucket, prefix);
      return json({ stats, prefix, bucket: row.bucket }, { origin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stats failed";
      return error(message, 400, origin, { code: "R2_STATS_FAILED" });
    }
  }

  if (search) {
    try {
      const result = await searchR2Objects(client, row.bucket, prefix, search);
      return json(
        {
          entries: result.entries,
          prefix,
          bucket: row.bucket,
          search,
          truncated: result.truncated,
          scanned: result.scanned,
        },
        { origin },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      return error(message, 400, origin, { code: "R2_SEARCH_FAILED" });
    }
  }

  try {
    const entries = await listR2Entries(client, row.bucket, prefix);
    return json({ entries, prefix, bucket: row.bucket }, { origin });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return error(message, 400, origin, { code: "R2_LIST_FAILED" });
  }
});

export const DELETE = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const row = await getOwnedCredential(authResult.auth.userId, id);
  if (!row) return error("Credential not found", 404, origin);

  const body = await readJson<unknown>(req);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400, origin);

  const { client } = clientFromCredential(row);
  try {
    await deleteR2Object(client, row.bucket, parsed.data.key);
    return json({ ok: true }, { origin });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return error(message, 400, origin);
  }
});

export const POST = withHandler(async (req, ctx) => {
  const origin = req.headers.get("origin");
  const authResult = await requireAuth(req);
  if ("error" in authResult) {
    return error(authResult.error, authResult.status, origin);
  }

  const { id } = await ctx.params;
  if (!id) return error("Missing id", 400, origin);

  const row = await getOwnedCredential(authResult.auth.userId, id);
  if (!row) return error("Credential not found", 404, origin);

  const { client } = clientFromCredential(row);
  const contentType = req.headers.get("content-type") ?? "";

  // Create folder (JSON)
  if (contentType.includes("application/json")) {
    const body = await readJson<unknown>(req);
    const parsed = folderSchema.safeParse(body);
    if (!parsed.success) return error("Invalid input", 400, origin);

    const base = parsed.data.prefix
      ? parsed.data.prefix.replace(/\/?$/, "/")
      : "";
    const key = `${base}${parsed.data.name.replace(/\/?$/, "")}/`;
    try {
      await putR2Object(client, row.bucket, key, new Uint8Array());
      return json({ ok: true, key }, { status: 201, origin });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Create folder failed";
      return error(message, 400, origin);
    }
  }

  // Upload file (multipart)
  try {
    const form = await req.formData();
    const file = form.get("file");
    const prefix = String(form.get("prefix") ?? "");
    if (!(file instanceof File)) {
      return error("file is required", 400, origin);
    }

    const base = prefix ? prefix.replace(/\/?$/, "/") : "";
    const key = `${base}${file.name}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await putR2Object(client, row.bucket, key, buf, file.type || undefined);
    return json({ ok: true, key }, { status: 201, origin });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return error(message, 400, origin);
  }
});
