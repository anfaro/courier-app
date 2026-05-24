// lib/db.ts
import { initializeDb, getDbInstance, updateDbConfig, resetToEnvVar, getDbStatus, saveProfile, deleteProfile, applyProfile } from "./db-manager";

await initializeDb();

const _db = getDbInstance();

export const db = new Proxy(_db, {
  get(target, prop: string | symbol) {
    if (prop === "then") return undefined;
    const value = (getDbInstance() as any)[prop as string];
    if (typeof value === "function") {
      return value.bind(getDbInstance());
    }
    return value;
  },
}) as typeof _db;

export { updateDbConfig, resetToEnvVar, getDbStatus, saveProfile, deleteProfile, applyProfile };
