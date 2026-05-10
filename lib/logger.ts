// lib/logger.ts
import { db } from "./db";
import { logs, errorLogs, accessLogs } from "./schema";
import { NextRequest } from "next/server";

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
  | "CLUSTER_DELETED";

export async function logActivity({
  userId,
  userName,
  action,
  details,
  targetId
}: {
  userId?: number;
  userName?: string;
  action: LogAction;
  details?: string;
  targetId?: string;
}) {
  try {
    await db.insert(logs).values({
      userId,
      userName,
      action,
      details,
      targetId
    });
  } catch (error) {
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
  userId?: number;
  userName?: string;
  errorName: string;
  errorMessage: string;
  stackTrace?: string;
  pathname?: string;
}) {
  try {
    await db.insert(errorLogs).values({
      userId,
      userName,
      errorName,
      errorMessage,
      stackTrace,
      pathname
    });
  } catch (error) {
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
  userId?: number;
  userName?: string;
  pathname: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.insert(accessLogs).values({
      userId,
      userName,
      pathname,
      method,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error("Critical: Failed to record access log:", error);
  }
}

// HELPER: Log raw server-side hits (POST, PUT, DELETE)
export async function logServerAccess(req: NextRequest, token: any) {
  const pathname = req.nextUrl.pathname;
  const method = req.method;
  const userAgent = req.headers.get("user-agent") || "Unknown";
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

  await logAccess({
    userId: token?.id ? parseInt(token.id as string) : undefined,
    userName: token?.name as string,
    pathname,
    method,
    ipAddress: ip,
    userAgent
  });
}
