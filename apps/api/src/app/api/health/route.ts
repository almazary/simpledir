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

    const tables = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'users',
          'email_verification_tokens',
          'refresh_tokens',
          'r2_credentials'
        )
      order by table_name
    `);

    // neon-http / pg drivers differ slightly in row shape
    const rows = Array.isArray(tables)
      ? tables
      : ((tables as { rows?: { table_name: string }[] }).rows ?? []);
    const tableNames = rows.map((r) => r.table_name);
    const required = [
      "users",
      "email_verification_tokens",
      "refresh_tokens",
      "r2_credentials",
    ];
    const missing = required.filter((t) => !tableNames.includes(t));

    return json(
      {
        ok: missing.length === 0,
        database: "up",
        schema: missing.length === 0 ? "ready" : "missing_tables",
        missing,
        driver: process.env.DATABASE_URL?.includes("neon.tech")
          ? "neon-http"
          : "pg",
      },
      { status: missing.length === 0 ? 200 : 503, origin },
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
