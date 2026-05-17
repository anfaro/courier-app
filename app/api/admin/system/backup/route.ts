// app/api/admin/system/backup/route.ts
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

    const [usr, cust, del, cl, cc, lgs, errLgs, accLgs] = await Promise.all([
      db.execute(sql`SELECT id, name, email, password, role, is_active, last_active_at, created_at, updated_at FROM users`),
      db.execute(sql`SELECT id, name, phone_number, address, latitude, longitude, house_picture_url, notes, created_at, updated_at FROM customers`),
      db.execute(sql`SELECT id, waybill_number, customer_id, status, cod_amount, receiver_name, proof_of_delivery_url, created_at, updated_at FROM deliveries`),
      db.execute(sql`SELECT * FROM clusters`),
      db.execute(sql`SELECT * FROM customer_clusters`),
      db.execute(sql`SELECT * FROM logs ORDER BY created_at DESC LIMIT 10000`),
      db.execute(sql`SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 5000`),
      db.execute(sql`SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 5000`),
    ]);

    const backup = {
      version: 3,
      exportedAt: new Date().toISOString(),
      meta: {
        limits: {
          logs: 10000,
          errorLogs: 5000,
          accessLogs: 5000,
        },
      },
      data: {
        users: Array.isArray(usr) ? usr : [],
        customers: Array.isArray(cust) ? cust : [],
        deliveries: Array.isArray(del) ? del : [],
        clusters: Array.isArray(cl) ? cl : [],
        customerClusters: Array.isArray(cc) ? cc : [],
        logs: Array.isArray(lgs) ? lgs : [],
        errorLogs: Array.isArray(errLgs) ? errLgs : [],
        accessLogs: Array.isArray(accLgs) ? accLgs : [],
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

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!body?.data) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    const { users: usrData, customers: custData, deliveries: delData, clusters: clData, customerClusters: ccData, logs: logsData, errorLogs: errData, accessLogs: accData } = body.data;
    let restored = 0;

    // Users
    if (Array.isArray(usrData) && usrData.length > 0) {
      for (const u of usrData) {
        const id = u.id || generateId();
        await db.execute(sql`INSERT INTO users (id, name, email, password, role, is_active, last_active_at, created_at, updated_at) VALUES (${id}, ${u.name}, ${u.email}, ${u.password}, ${u.role || "courier"}, ${u.is_active ?? false}, ${u.last_active_at ?? u.lastActiveAt ?? null}, ${u.created_at ?? u.createdAt ?? new Date()}, ${u.updated_at ?? u.updatedAt ?? new Date()}) ON CONFLICT (id) DO NOTHING`);
      }
      restored += usrData.length;
    }

    // Clusters
    if (Array.isArray(clData) && clData.length > 0) {
      await db.insert(clusters).values(clData.map((c: any) => ({
        id: c.id || generateId(), name: c.name, notes: c.notes,
        createdAt: c.created_at ?? c.createdAt ?? new Date(),
        updatedAt: c.updated_at ?? c.updatedAt ?? new Date(),
      }))).onConflictDoNothing();
      restored += clData.length;
    }

    // Customers
    if (Array.isArray(custData) && custData.length > 0) {
      await db.insert(customers).values(custData.map((c: any) => ({
        id: c.id || generateId(), name: c.name, phoneNumber: c.phoneNumber, address: c.address,
        latitude: c.latitude, longitude: c.longitude, housePictureUrl: c.housePictureUrl, notes: c.notes,
        createdAt: c.created_at ?? c.createdAt ?? new Date(),
        updatedAt: c.updated_at ?? c.updatedAt ?? new Date(),
      }))).onConflictDoNothing();
      restored += custData.length;
    }

    // Customer-cluster relations
    if (Array.isArray(ccData) && ccData.length > 0) {
      await db.insert(customerClusters).values(ccData.map((cc: any) => ({
        customerId: cc.customerId || cc.customer_id,
        clusterId: cc.clusterId || cc.cluster_id,
      }))).onConflictDoNothing();
      restored += ccData.length;
    }

    // Deliveries
    if (Array.isArray(delData) && delData.length > 0) {
      await db.insert(deliveries).values(delData.map((d: any) => ({
        id: d.id || generateId(), waybillNumber: d.waybillNumber, customerId: d.customerId,
        status: d.status || "Pending", codAmount: d.codAmount || "0", receiverName: d.receiverName,
        proofOfDeliveryUrl: d.proofOfDeliveryUrl,
        createdAt: d.created_at ?? d.createdAt ?? new Date(),
        updatedAt: d.updated_at ?? d.updatedAt ?? new Date(),
      }))).onConflictDoNothing();
      restored += delData.length;
    }

    // Logs
    if (Array.isArray(logsData) && logsData.length > 0) {
      for (const l of logsData) {
        await db.execute(sql`INSERT INTO logs (id, user_id, user_name, action, details, target_id, created_at) VALUES (${l.id || generateId()}, ${l.userId ?? l.user_id}, ${l.userName ?? l.user_name}, ${l.action}, ${l.details}, ${l.targetId ?? l.target_id}, ${l.created_at ?? l.createdAt ?? new Date()}) ON CONFLICT (id) DO NOTHING`);
      }
      restored += logsData.length;
    }

    // Error logs
    if (Array.isArray(errData) && errData.length > 0) {
      for (const e of errData) {
        await db.execute(sql`INSERT INTO error_logs (id, user_id, user_name, error_name, error_message, stack_trace, pathname, created_at) VALUES (${e.id || generateId()}, ${e.userId ?? e.user_id}, ${e.userName ?? e.user_name}, ${e.errorName ?? e.error_name}, ${e.errorMessage ?? e.error_message}, ${e.stackTrace ?? e.stack_trace}, ${e.pathname}, ${e.created_at ?? e.createdAt ?? new Date()}) ON CONFLICT (id) DO NOTHING`);
      }
      restored += errData.length;
    }

    // Access logs
    if (Array.isArray(accData) && accData.length > 0) {
      for (const a of accData) {
        await db.execute(sql`INSERT INTO access_logs (id, user_id, user_name, pathname, method, ip_address, user_agent, created_at) VALUES (${a.id || generateId()}, ${a.userId ?? a.user_id}, ${a.userName ?? a.user_name}, ${a.pathname}, ${a.method}, ${a.ipAddress ?? a.ip_address}, ${a.userAgent ?? a.user_agent}, ${a.created_at ?? a.createdAt ?? new Date()}) ON CONFLICT (id) DO NOTHING`);
      }
      restored += accData.length;
    }

    await logActivity({
      userId: token.id as string, userName: token.name as string,
      action: "RESTORE_EXECUTED",
      details: `Restored ${restored} records from backup.`,
    });

    return NextResponse.json({ message: `Restored ${restored} records.` });
  } catch (error: any) {
    await logError({ errorName: "RestoreError", errorMessage: error.message });
    return NextResponse.json({ error: error.message || "Restore failed" }, { status: 500 });
  }
}
