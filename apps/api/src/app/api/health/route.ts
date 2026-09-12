import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { json, optionsResponse } from "@/lib/http";

export function OPTIONS(req: Request) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  try {
    const db = getDb();
    await db.execute(sql`select 1 as ok`);
    return json(
      {
        ok: true,
        database: "up",
        driver: process.env.DATABASE_URL?.includes("neon.tech")
          ? "neon-http"
          : "pg",
      },
      { origin },
    );
  } catch (err) {
    console.error("[health]", err);
    return json(
      {
        ok: false,
        database: "down",
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500, origin },
    );
  }
}
