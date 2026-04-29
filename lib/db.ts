// lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Ensure the connection string exists
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

// Create the connection and export the db instance
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

