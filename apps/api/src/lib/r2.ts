import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type R2ConnInput = {
  accountId: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type NormalizedKeys = {
  accessKeyId: string;
  secretAccessKey: string;
  swapped: boolean;
};

/** R2 access key IDs are 32 chars; secrets are typically 64. Swap if reversed. */
export function normalizeR2Keys(
  accessKeyId: string,
  secretAccessKey: string,
): NormalizedKeys {
  const a = accessKeyId.trim();
  const s = secretAccessKey.trim();
  if (a.length === 64 && s.length === 32) {
    return { accessKeyId: s, secretAccessKey: a, swapped: true };
  }
  return { accessKeyId: a, secretAccessKey: s, swapped: false };
}

export function r2Endpoint(accountId: string, endpoint?: string) {
  if (endpoint?.trim()) return endpoint.trim().replace(/\/$/, "");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function createR2Client(input: R2ConnInput) {
  const keys = normalizeR2Keys(input.accessKeyId, input.secretAccessKey);
  return {
    client: new S3Client({
      region: "auto",
      endpoint: r2Endpoint(input.accountId, input.endpoint),
      forcePathStyle: true,
      credentials: {
        accessKeyId: keys.accessKeyId,
        secretAccessKey: keys.secretAccessKey,
      },
    }),
    keys,
    endpoint: r2Endpoint(input.accountId, input.endpoint),
  };
}

export async function ensureBucketCors(client: S3Client, bucket: string) {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}

export async function testR2Connection(input: R2ConnInput): Promise<{
  ok: true;
  endpoint: string;
  swapped: boolean;
  corsApplied: boolean;
  corsError?: string;
  objectCount: number;
}> {
  const { client, keys, endpoint } = createR2Client(input);

  try {
    await client.send(new HeadBucketCommand({ Bucket: input.bucket }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "HeadBucket failed";
    // Some tokens cannot HeadBucket but can List — try list as fallback
    try {
      await client.send(
        new ListObjectsV2Command({
          Bucket: input.bucket,
          MaxKeys: 1,
        }),
      );
    } catch (listErr) {
      const listMessage =
        listErr instanceof Error ? listErr.message : "ListObjects failed";
      throw new Error(
        `Cannot access bucket “${input.bucket}”: ${message} / ${listMessage}. Check Account ID, bucket name, and that Access Key (32 chars) / Secret (64 chars) are not swapped.`,
      );
    }
  }

  const listed = await client.send(
    new ListObjectsV2Command({
      Bucket: input.bucket,
      MaxKeys: 5,
    }),
  );

  let corsApplied = false;
  let corsError: string | undefined;
  try {
    await ensureBucketCors(client, input.bucket);
    corsApplied = true;
  } catch (err) {
    corsError =
      err instanceof Error
        ? err.message
        : "Could not update bucket CORS (token may lack permission)";
  }

  return {
    ok: true,
    endpoint,
    swapped: keys.swapped,
    corsApplied,
    corsError,
    objectCount: listed.KeyCount ?? 0,
  };
}

export type R2EntryDto = {
  key: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: string;
};

export async function listR2Entries(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<R2EntryDto[]> {
  const normalized = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: normalized || undefined,
      Delimiter: "/",
    }),
  );

  const folders = (res.CommonPrefixes ?? [])
    .map((p) => p.Prefix!)
    .filter(Boolean)
    .map((key) => ({
      key,
      name: key.slice(normalized.length).replace(/\/$/, ""),
      type: "folder" as const,
    }));

  const files = (res.Contents ?? [])
    .filter((o) => o.Key && o.Key !== normalized)
    .map((o) => ({
      key: o.Key!,
      name: o.Key!.slice(normalized.length),
      type: "file" as const,
      size: o.Size,
      lastModified: o.LastModified?.toISOString(),
    }));

  return [...folders, ...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export type PrefixStats = {
  objectCount: number;
  totalBytes: number;
  truncated: boolean;
};

export type SearchResult = {
  entries: R2EntryDto[];
  truncated: boolean;
  scanned: number;
};

/** Case-insensitive name/path search under prefix (recursive). */
export async function searchR2Objects(
  client: S3Client,
  bucket: string,
  prefix: string,
  query: string,
  opts?: { maxPages?: number; pageSize?: number; maxResults?: number },
): Promise<SearchResult> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { entries: [], truncated: false, scanned: 0 };
  }

  const normalized = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;
  const maxPages = opts?.maxPages ?? 30;
  const pageSize = opts?.pageSize ?? 1000;
  const maxResults = opts?.maxResults ?? 200;

  let continuationToken: string | undefined;
  let pages = 0;
  let scanned = 0;
  let truncated = false;
  const entries: R2EntryDto[] = [];

  do {
    pages += 1;
    if (pages > maxPages) {
      truncated = true;
      break;
    }

    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalized || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: pageSize,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key === normalized) continue;
      scanned += 1;

      const relative = obj.Key.slice(normalized.length);
      if (!relative.toLowerCase().includes(q)) continue;

      const isFolder = obj.Key.endsWith("/") && (obj.Size ?? 0) === 0;
      entries.push({
        key: obj.Key,
        name: relative.replace(/\/$/, ""),
        type: isFolder ? "folder" : "file",
        size: isFolder ? undefined : obj.Size,
        lastModified: obj.LastModified?.toISOString(),
      });

      if (entries.length >= maxResults) {
        truncated = true;
        break;
      }
    }

    if (truncated && entries.length >= maxResults) break;

    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;
  } while (continuationToken);

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { entries, truncated, scanned };
}

/** Sum size of all objects under prefix (recursive, no delimiter). Caps pages for safety. */
export async function summarizePrefix(
  client: S3Client,
  bucket: string,
  prefix: string,
  opts?: { maxPages?: number; pageSize?: number },
): Promise<PrefixStats> {
  const normalized = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;
  const maxPages = opts?.maxPages ?? 50;
  const pageSize = opts?.pageSize ?? 1000;

  let continuationToken: string | undefined;
  let objectCount = 0;
  let totalBytes = 0;
  let pages = 0;
  let truncated = false;

  do {
    pages += 1;
    if (pages > maxPages) {
      truncated = true;
      break;
    }

    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalized || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: pageSize,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key === normalized) continue;
      // Skip zero-byte folder placeholders ending with /
      if (obj.Key.endsWith("/") && (obj.Size ?? 0) === 0) continue;
      objectCount += 1;
      totalBytes += obj.Size ?? 0;
    }

    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return { objectCount, totalBytes, truncated };
}

export async function deleteR2Object(
  client: S3Client,
  bucket: string,
  key: string,
) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function putR2Object(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string,
) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getR2ObjectBytes(
  client: S3Client,
  bucket: string,
  key: string,
) {
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty object body");
  return {
    bytes,
    contentType: res.ContentType ?? "application/octet-stream",
  };
}

