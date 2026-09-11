import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { CredentialSecrets } from "@simpledir/shared";

export type R2Entry = {
  key: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: string;
};

export function createR2Client(cred: CredentialSecrets) {
  return new S3Client({
    region: "auto",
    endpoint: cred.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cred.accessKeyId,
      secretAccessKey: cred.secretAccessKey,
    },
  });
}

function joinPrefix(prefix: string, name: string) {
  const base = prefix.replace(/^\//, "").replace(/\/?$/, prefix ? "/" : "");
  return `${base}${name}`;
}

export async function listEntries(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<R2Entry[]> {
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

export async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  body: Blob | Uint8Array | ArrayBuffer,
  onProgress?: (pct: number) => void,
) {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
    },
  });

  upload.on("httpUploadProgress", (p) => {
    if (onProgress && p.total && p.loaded != null) {
      onProgress(Math.round((p.loaded / p.total) * 100));
    }
  });

  await upload.done();
}

export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string,
) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function downloadObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Blob> {
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty download");
  return new Blob([bytes]);
}

export async function createFolder(
  client: S3Client,
  bucket: string,
  prefix: string,
  name: string,
) {
  const key = joinPrefix(prefix, name).replace(/\/?$/, "/") ;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(),
    }),
  );
}

export { joinPrefix };
