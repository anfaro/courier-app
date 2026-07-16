// scripts/migrate-mobile-auth.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString, { ssl: "require" });
const db = drizzle(client);

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN "api_token" text UNIQUE`);
    console.log("Migration: added api_token column to users table");
  } catch (error: any) {
    if (error?.message?.includes("already exists")) {
      console.log("Migration: api_token column already exists, skipping");
    } else {
      throw error;
    }
  }
  await client.end();
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
