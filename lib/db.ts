// lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 300,
  connect_timeout: 10,
  max_lifetime: 3600,
});

// Warm the connection as early as possible
await client`SELECT 1`.catch(() => {});

export const db = drizzle(client, { schema });

