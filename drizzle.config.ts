// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/schema.ts", // Where your database tables are defined
  out: "./drizzle", // Where Drizzle will save the generated SQL files
  dialect: "postgresql",
  dbCredentials: {
    // We use the ! to tell TypeScript we are sure this variable exists
    database: process.env.DATABASE as string,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST as string,
    user: process.env.USER,
    password: process.env.PASSWORD,
  },
  verbose: true,
  strict: true,
});
