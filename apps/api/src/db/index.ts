import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reuse pool across hot reloads in Next.js dev
  var __simpledirPgPool: Pool | undefined;
}

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!globalThis.__simpledirPgPool) {
    globalThis.__simpledirPgPool = new Pool({
      connectionString: url,
      max: 5,
    });
  }

  return globalThis.__simpledirPgPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;
