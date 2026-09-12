import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const local =
    url.includes("localhost") || url.includes("127.0.0.1");
  const neonHost = url.includes("neon.tech");

  if (neonHost && !local) {
    const sql = neon(url);
    const db = drizzleNeon(sql);
    await migrateNeon(db, { migrationsFolder: "./drizzle" });
  } else {
    const pool = new Pool({
      connectionString: url,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
    const db = drizzlePg(pool);
    await migratePg(db, { migrationsFolder: "./drizzle" });
    await pool.end();
  }

  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
