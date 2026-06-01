// lib/logger.ts
import { db } from "./db";
import { logs, errorLogs, accessLogs } from "./schema";
import { NextRequest } from "next/server";
import { generateId } from "./utils";
import { sql } from "drizzle-orm";

export type LogAction = 
  | "USER_LOGIN"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DELETED"
  | "DELIVERY_CREATED"
  | "DELIVERY_UPDATED"
  | "DELIVERY_DELETED"
  | "BULK_DELIVERY_SAVE"
  | "CLUSTER_CREATED"
  | "CLUSTER_UPDATED"
  | "CLUSTER_DELETED"
  | "RESTORE_EXECUTED"
  | "BACKUP_DOWNLOADED"
  | "GEOCODE_BULK"
  | "VISIT_CHECKED_IN"
  | "VISIT_CHECKED_OUT"
  | "TRIP_CREATED"
  | "TRIP_DELETED"
  | "SESSION_CREATED"
  | "SESSION_UPDATED"
  | "SESSION_DELETED"
  | "INCOMING_ADDED"
  | "DELIVERY_STATUS_CHANGED"
  | "IMAGE_UPLOADED"
  | "SEARCH_QUERIED";

export async function logActivity({
  userId,
  userName,
  action,
  details,
  targetId
}: {
  userId?: string;
  userName?: string;
  action: LogAction;
  details?: string;
  targetId?: string;
}) {
  const insert = (uid?: string) =>
    db.insert(logs).values({
      id: generateId(),
      userId: uid,
      userName,
      action,
      details,
      targetId
    });

  try {
    await insert(userId);
  } catch (error: any) {
    if (
      userId &&
      error?.code === "23503" &&
      error?.constraint_name === "logs_user_id_users_id_fk"
    ) {
      await insert(undefined);
      return;
    }
    console.error("Critical: Failed to record activity log:", error);
  }
}

export async function logError({
  userId,
  userName,
  errorName,
  errorMessage,
  stackTrace,
  pathname
}: {
  userId?: string;
  userName?: string;
  errorName: string;
  errorMessage: string;
  stackTrace?: string;
  pathname?: string;
}) {
  const insert = (uid?: string) =>
    db.insert(errorLogs).values({
      id: generateId(),
      userId: uid,
      userName,
      errorName,
      errorMessage,
      stackTrace,
      pathname
    });

  try {
    await insert(userId);
  } catch (error: any) {
    if (
      userId &&
      error?.code === "23503" &&
      error?.constraint_name === "error_logs_user_id_users_id_fk"
    ) {
      await insert(undefined);
      return;
    }
    console.error("Critical: Failed to record error log:", error);
  }
}

export async function logAccess({
  userId,
  userName,
  pathname,
  method,
  ipAddress,
  userAgent
}: {
  userId?: string;
  userName?: string;
  pathname: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const insert = (uid?: string) =>
    db.insert(accessLogs).values({
      id: generateId(),
      userId: uid,
      userName,
      pathname,
      method,
      ipAddress,
      userAgent
    });

  try {
    await insert(userId);
    pruneAccessLogs();
  } catch (error: any) {
    if (
      userId &&
      error?.code === "23503" &&
      error?.constraint_name === "access_logs_user_id_users_id_fk"
    ) {
      await insert(undefined);
      return;
    }
    console.error("Critical: Failed to record access log:", error);
  }
}

async function pruneAccessLogs(max = 100) {
  try {
    await db.execute(sql`
      DELETE FROM access_logs WHERE id IN (
        SELECT id FROM access_logs ORDER BY created_at DESC OFFSET ${max}
      )
    `);
  } catch {
    // silently swallow — cleanup is best-effort
  }
}

// HELPER: Log raw server-side hits (POST, PUT, DELETE)
export async function logServerAccess(req: NextRequest, token: any) {
  const pathname = req.nextUrl.pathname;
  const method = req.method;
  const userAgent = req.headers.get("user-agent") || "Unknown";
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

  await logAccess({
    userId: token?.id ? (token.id as string) : undefined,
    userName: token?.name as string,
    pathname,
    method,
    ipAddress: ip,
    userAgent
  });
}
