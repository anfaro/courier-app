import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, deliveries, clusters, customerClusters, users, logs, errorLogs, accessLogs } from "@/lib/schema";
import { generateId } from "@/lib/utils";
import { logActivity, logError } from "@/lib/logger";
import { sql } from "drizzle-orm";
import { gzipSync } from "zlib";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [cust, del, cl, cc] = await Promise.all([
      db.execute(sql`SELECT id, name, phone_number, address, latitude, longitude, house_picture_url, notes, created_at, updated_at FROM customers`),
      db.execute(sql`SELECT id, waybill_number, customer_id, status, cod_amount, receiver_name, proof_of_delivery_url, created_at, updated_at FROM deliveries`),
      db.execute(sql`SELECT * FROM clusters`),
      db.execute(sql`SELECT * FROM customer_clusters`),
    ]);

    const backup = {
      version: 3,
      exportedAt: new Date().toISOString(),
      data: {
        customers: Array.isArray(cust) ? cust : [],
        deliveries: Array.isArray(del) ? del : [],
        clusters: Array.isArray(cl) ? cl : [],
        customerClusters: Array.isArray(cc) ? cc : [],
      },
    };

    const json = JSON.stringify(backup);
    const compressed = gzipSync(json);
    const filename = `backup-${new Date().toISOString().slice(0, 10)}.json.gz`;

    return new NextResponse(compressed, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(compressed.length),
      },
    });
  } catch (error: any) {
    await logError({ errorName: "BackupError", errorMessage: error.message });
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

function toDate(v: any): Date {
  if (v == null) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

const CHUNK = 5;
const CHUNK_DELAY = 300;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function retryInsert<T>(table: any, values: T[]): Promise<void> {
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(table).values(values).onConflictDoNothing();
      return;
    } catch (err: any) {
      lastErr = err;
      if (attempt < 2) {
        await sleep(1000 * Math.pow(3, attempt));
      }
    }
  }
  throw lastErr;
}

async function restoreTable(table: string, rows: any[]): Promise<number> {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  let count = 0;

  async function batchInsert<T>(table: any, values: T[]) {
    for (let i = 0; i < values.length; i += CHUNK) {
      await retryInsert(table, values.slice(i, i + CHUNK));
      await sleep(CHUNK_DELAY);
    }
  }

  switch (table) {
    case "users": {
      await db.insert(users).values(rows.map((u: any) => ({
        id: u.id || generateId(), name: u.name, email: u.email, password: u.password,
        role: u.role || "courier",
        isActive: u.is_active ?? u.isActive ?? false,
        lastActiveAt: toDate(u.last_active_at ?? u.lastActiveAt ?? null),
        createdAt: toDate(u.created_at ?? u.createdAt),
        updatedAt: toDate(u.updated_at ?? u.updatedAt),
      }))).onConflictDoNothing();
      count = rows.length;
      break;
    }
    case "clusters": {
      await batchInsert(clusters, rows.map((c: any) => ({
        id: c.id || generateId(), name: c.name, notes: c.notes,
        createdAt: toDate(c.created_at ?? c.createdAt),
        updatedAt: toDate(c.updated_at ?? c.updatedAt),
      })));
      count = rows.length;
      break;
    }
    case "customers": {
      await batchInsert(customers, rows.map((c: any) => ({
        id: c.id || generateId(), name: c.name,
        phoneNumber: c.phoneNumber ?? c.phone_number,
        address: c.address,
        latitude: c.latitude, longitude: c.longitude,
        housePictureUrl: c.housePictureUrl ?? c.house_picture_url,
        notes: c.notes,
        createdAt: toDate(c.created_at ?? c.createdAt),
        updatedAt: toDate(c.updated_at ?? c.updatedAt),
      })));
      count = rows.length;
      break;
    }
    case "deliveries": {
      await batchInsert(deliveries, rows.map((d: any) => ({
        id: d.id || generateId(),
        waybillNumber: d.waybillNumber ?? d.waybill_number,
        customerId: d.customerId ?? d.customer_id,
        status: d.status || "Pending",
        codAmount: d.codAmount ?? d.cod_amount ?? "0",
        receiverName: d.receiverName ?? d.receiver_name,
        proofOfDeliveryUrl: d.proofOfDeliveryUrl ?? d.proof_of_delivery_url,
        createdAt: toDate(d.created_at ?? d.createdAt),
        updatedAt: toDate(d.updated_at ?? d.updatedAt),
      })));
      count = rows.length;
      break;
    }
    case "customerClusters": {
      await batchInsert(customerClusters, rows.map((cc: any) => ({
        customerId: cc.customerId || cc.customer_id,
        clusterId: cc.clusterId || cc.cluster_id,
      })));
      count = rows.length;
      break;
    }
    case "logs": {
      await batchInsert(logs, rows.map((l: any) => ({
        id: l.id || generateId(),
        userId: l.userId ?? l.user_id,
        userName: l.userName ?? l.user_name,
        action: l.action,
        details: l.details,
        targetId: l.targetId ?? l.target_id,
        createdAt: toDate(l.created_at ?? l.createdAt),
      })));
      count = rows.length;
      break;
    }
    case "errorLogs": {
      await batchInsert(errorLogs, rows.map((e: any) => ({
        id: e.id || generateId(),
        userId: e.userId ?? e.user_id,
        userName: e.userName ?? e.user_name,
        errorName: e.errorName ?? e.error_name,
        errorMessage: e.errorMessage ?? e.error_message,
        stackTrace: e.stackTrace ?? e.stack_trace,
        pathname: e.pathname,
        createdAt: toDate(e.created_at ?? e.createdAt),
      })));
      count = rows.length;
      break;
    }
    case "accessLogs": {
      await batchInsert(accessLogs, rows.map((a: any) => ({
        id: a.id || generateId(),
        userId: a.userId ?? a.user_id,
        userName: a.userName ?? a.user_name,
        pathname: a.pathname,
        method: a.method,
        ipAddress: a.ipAddress ?? a.ip_address,
        userAgent: a.userAgent ?? a.user_agent,
        createdAt: toDate(a.created_at ?? a.createdAt),
      })));
      count = rows.length;
      break;
    }
  }
  return count;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    let totalRestored = 0;

    // Single-table mode: { table: "customers", rows: [...] }
    if (body.table && Array.isArray(body.rows)) {
      totalRestored = await restoreTable(body.table, body.rows);
      return NextResponse.json({
        message: `Restored ${totalRestored} records in ${body.table}.`,
        table: body.table,
        restored: totalRestored,
      });
    }

    // Full backup mode: { data: { users: [...], ... } }
    if (!body?.data) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    const { users: usrData, customers: custData, deliveries: delData, clusters: clData, customerClusters: ccData, logs: logsData, errorLogs: errData, accessLogs: accData } = body.data;

    totalRestored += await restoreTable("users", usrData);
    totalRestored += await restoreTable("clusters", clData);
    totalRestored += await restoreTable("customers", custData);
    totalRestored += await restoreTable("customerClusters", ccData);
    totalRestored += await restoreTable("deliveries", delData);
    totalRestored += await restoreTable("logs", logsData);
    totalRestored += await restoreTable("errorLogs", errData);
    totalRestored += await restoreTable("accessLogs", accData);

    await logActivity({
      userId: token.id as string, userName: token.name as string,
      action: "RESTORE_EXECUTED",
      details: `Restored ${totalRestored} records from backup.`,
    });

    return NextResponse.json({ message: `Restored ${totalRestored} records.` });
  } catch (error: any) {
    await logError({ errorName: "RestoreError", errorMessage: error.message });
    return NextResponse.json({ error: error.message || "Restore failed" }, { status: 500 });
  }
}
