// scripts/migrate-perf-indexes.ts
// Applies 0018_perf_indexes.sql against the configured database.
// Connection string is read from data/db-config.json first, falling back to DATABASE_URL.
import { promises as fs } from "fs";
import path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "db-config.json");

async function getConnectionString(): Promise<{ url: string; ssl: "require" | false }> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    if (config.databaseUrl) {
      return { url: config.databaseUrl, ssl: config.ssl === "disable" ? false : "require" };
    }
  } catch {}
  if (!process.env.DATABASE_URL) {
    throw new Error("No db-config.json and DATABASE_URL is not set");
  }
  return { url: process.env.DATABASE_URL, ssl: "require" };
}

async function migrate() {
  const { url, ssl } = await getConnectionString();
  const client = postgres(url, { ssl });

  const sql = await fs.readFile(
    path.join(process.cwd(), "drizzle", "0018_perf_indexes.sql"),
    "utf-8"
  );

  for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.unsafe(statement);
      console.log(`OK: ${statement.split("\n")[0].slice(0, 80)}...`);
    } catch (error: any) {
      if (error?.message?.includes("already exists")) {
        console.log(`SKIP (exists): ${statement.split("\n")[0].slice(0, 80)}...`);
      } else {
        throw error;
      }
    }
  }

  await client.end();
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
