import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();
import postgres from "postgres";

const IIMG_API = "https://api.iimg.live/upload";
const MAX_RETRIES = 3;

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});

async function uploadToIimgLive(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.IIMG_LIVE_API_KEY;
  if (!apiKey) throw new Error("IIMG_LIVE_API_KEY not set");

  const formData = new FormData();
  const blob = new Blob([buffer], { type: "image/webp" });
  formData.append("image", blob, filename);

  const res = await fetch(IIMG_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (res.status === 429) {
    const text = await res.text();
    throw new RateLimitedError(text);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.success || !data.url)
    throw new Error("Unexpected response from iimg.live");

  return data.url;
}

class RateLimitedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RateLimitedError";
  }
}

function isBase64DataUrl(value: string | null): boolean {
  return !!value && value.startsWith("data:image/");
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function migrateTable(
  table: "customers" | "deliveries",
  column: string,
  idColumn: string
): Promise<{ total: number; migrated: number; skipped: number; failed: number }> {
  const rows: any[] =
    await sql`SELECT ${sql(idColumn)} as id, ${sql(column)} as url FROM ${sql(table)} WHERE ${sql(column)} IS NOT NULL AND ${sql(column)} LIKE 'data:image/%'`;

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, row] of rows.entries()) {
    const url: string = row.url;
    let retries = 0;

    if (!isBase64DataUrl(url)) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${index + 1}/${rows.length}] [${table}] id=${row.id} (${(url.length / 1024).toFixed(0)}KB)... `);

    while (retries <= MAX_RETRIES) {
      try {
        const { buffer } = parseDataUrl(url);
        const cdnUrl = await uploadToIimgLive(buffer, `${table}_${row.id}.webp`);

        await sql`UPDATE ${sql(table)} SET ${sql(column)} = ${cdnUrl} WHERE ${sql(idColumn)} = ${row.id}`;

        process.stdout.write(`✓ ${cdnUrl}\n`);
        migrated++;
        break;
      } catch (err: any) {
        if (err instanceof RateLimitedError) {
          retries++;
          if (retries > MAX_RETRIES) {
            process.stdout.write(`✗ rate limited after ${MAX_RETRIES} retries\n`);
            failed++;
            break;
          }
          process.stdout.write(`⏳ rate limited, waiting 1h (retry ${retries}/${MAX_RETRIES})...\n`);
          await sleep(60 * 60 * 1000);
        } else {
          process.stdout.write(`✗ ${err.message}\n`);
          failed++;
          break;
        }
      }
    }
  }

  return { total: rows.length, migrated, skipped, failed };
}

async function main() {
  console.log("=== iimg.live Image Migration ===\n");
  console.log(`DB: ${process.env.DATABASE_URL?.slice(0, 40)}...\n`);

  if (!process.env.IIMG_LIVE_API_KEY) {
    console.error("ERROR: IIMG_LIVE_API_KEY is not set in environment");
    process.exit(1);
  }

  console.log("--- Migrating customers.house_picture_url ---");
  const customers = await migrateTable("customers", "house_picture_url", "id");

  console.log("\n--- Migrating deliveries.proof_of_delivery_url ---");
  const deliveries = await migrateTable("deliveries", "proof_of_delivery_url", "id");

  console.log("\n=== Summary ===");
  console.log(`Customers: ${customers.total} total, ${customers.migrated} migrated, ${customers.skipped} skipped, ${customers.failed} failed`);
  console.log(`Deliveries: ${deliveries.total} total, ${deliveries.migrated} migrated, ${deliveries.skipped} skipped, ${deliveries.failed} failed`);
  console.log(`Total migrated: ${customers.migrated + deliveries.migrated}`);

  await sql.end();
  process.exit(customers.failed + deliveries.failed > 0 ? 1 : 0);
}

main();
