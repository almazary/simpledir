import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reuse pool across hot reloads in Next.js dev
  var __simpledirPgPool: Pool | undefined;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

function isNeonDatabase(url: string): boolean {
  return url.includes("neon.tech") || process.env.DATABASE_DRIVER === "neon";
}

function getPgPool() {
  const url = databaseUrl();
  if (!globalThis.__simpledirPgPool) {
    globalThis.__simpledirPgPool = new Pool({
      connectionString: url,
      max: isLocalDatabase(url) ? 5 : 1,
      // Avoid pg v8 treating sslmode=require as verify-full failures on Vercel
      ssl: isLocalDatabase(url)
        ? undefined
        : {
            rejectUnauthorized: false,
          },
    });
  }
  return globalThis.__simpledirPgPool;
}

export function getDb() {
  const url = databaseUrl();

  // Neon on Vercel: HTTP driver is more reliable than TCP pg Pool in serverless
  if (isNeonDatabase(url) && !isLocalDatabase(url)) {
    const sql = neon(url);
    return drizzleNeon(sql, { schema });
  }

  return drizzlePg(getPgPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;
