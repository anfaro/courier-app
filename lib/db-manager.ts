import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL ? "/tmp/data" : path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "db-config.json");
const PROFILES_PATH = path.join(DATA_DIR, "db-profiles.json");

let currentClient: postgres.Sql | null = null;
let currentDb: ReturnType<typeof drizzle> | null = null;

function buildConnectionString(config: Record<string, string>): string {
  if (config.databaseUrl) return config.databaseUrl;
  const host = config.host || "localhost";
  const port = config.port || "5432";
  const database = config.database || "";
  const user = config.user || "";
  const password = config.password || "";
  if (password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return `postgresql://${user}@${host}:${port}/${database}`;
}

async function readConfig(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function getConnectionString(): Promise<string> {
  const config = await readConfig();
  if (config.databaseUrl || config.host || config.database) {
    return buildConnectionString(config);
  }
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    throw new Error("DATABASE_URL is missing and no db-config.json found");
  }
  return envUrl;
}

function createClient(connectionString: string) {
  return postgres(connectionString, {
    prepare: false,
    max: 2,
    idle_timeout: 300,
    connect_timeout: 30,
    max_lifetime: 3600,
    ssl: "require",
  });
}

export async function initializeDb() {
  const connectionString = await getConnectionString();
  currentClient = createClient(connectionString);
  await currentClient`SELECT 1`.catch(() => {});
  currentDb = drizzle(currentClient, { schema });
  return currentDb;
}

export function getDbInstance(): ReturnType<typeof drizzle> {
  if (!currentDb) {
    throw new Error("Database not initialized. Call initializeDb() first.");
  }
  return currentDb;
}

export async function updateDbConfig(config: Record<string, string>) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");

  if (currentClient) {
    try { await currentClient.end({ timeout: 5 }); } catch {}
  }

  const connectionString = buildConnectionString(config);
  currentClient = createClient(connectionString);
  await currentClient`SELECT 1`.catch(() => {});
  currentDb = drizzle(currentClient, { schema });
  return currentDb;
}

export async function resetToEnvVar() {
  try {
    await fs.unlink(CONFIG_PATH);
  } catch {}

  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    throw new Error("DATABASE_URL is missing in environment variables");
  }

  if (currentClient) {
    try { await currentClient.end({ timeout: 5 }); } catch {}
  }

  currentClient = createClient(envUrl);
  await currentClient`SELECT 1`.catch(() => {});
  currentDb = drizzle(currentClient, { schema });
  return currentDb;
}

export async function getDbStatus() {
  const config = await readConfig();
  const usingConfigFile = Object.keys(config).length > 0;

  let connectionString = "";
  try {
    connectionString = usingConfigFile ? buildConnectionString(config) : process.env.DATABASE_URL || "";
  } catch {}

  let host = "";
  let database = "";
  let user = "";
  let hasPassword = false;
  try {
    const url = new URL(connectionString);
    host = url.hostname;
    database = url.pathname.slice(1);
    user = url.username;
    hasPassword = !!url.password;
  } catch {}

  const profiles = await listProfiles();

  return {
    connected: !!currentDb,
    usingConfigFile,
    source: usingConfigFile ? "db-config.json" : "DATABASE_URL env var",
    host,
    database,
    user,
    hasPassword,
    profiles,
  };
}

// ---- Profile management ----

interface DbProfile {
  name: string;
  config: Record<string, string>;
  updatedAt: string;
}

async function readProfiles(): Promise<DbProfile[]> {
  try {
    const raw = await fs.readFile(PROFILES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeProfiles(profiles: DbProfile[]) {
  await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
  await fs.writeFile(PROFILES_PATH, JSON.stringify(profiles, null, 2), "utf-8");
}

export async function listProfiles(): Promise<DbProfile[]> {
  return readProfiles();
}

export async function saveProfile(name: string, config: Record<string, string>): Promise<void> {
  const profiles = await readProfiles();
  const idx = profiles.findIndex((p) => p.name === name);
  const entry: DbProfile = { name, config, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    profiles[idx] = entry;
  } else {
    profiles.push(entry);
  }
  await writeProfiles(profiles);
}

export async function deleteProfile(name: string): Promise<void> {
  const profiles = await readProfiles();
  await writeProfiles(profiles.filter((p) => p.name !== name));
}

export async function applyProfile(name: string): Promise<void> {
  const profiles = await readProfiles();
  const profile = profiles.find((p) => p.name === name);
  if (!profile) throw new Error(`Profile "${name}" not found`);
  await updateDbConfig(profile.config);
}
