import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, clusters, customerClusters, users, customerVisits, sessions, incomings, sessionDeliveries, savedRoutes, passwordResetTokens } from "@/lib/schema";
import { generateId } from "@/lib/utils";
import { logActivity, logError } from "@/lib/logger";
import { sql } from "drizzle-orm";
import { gzipSync } from "zlib";

export const runtime = "nodejs";

const BACKUP_VERSION = 6;

const ALL_TABLES = ["users", "clusters", "customers", "customerClusters", "sessions", "incomings", "sessionDeliveries", "customerVisits", "savedRoutes", "passwordResetTokens"] as const;

const TABLE_SQL_NAMES: Record<string, string> = {
  users: "users",
  clusters: "clusters",
  customers: "customers",
  customerClusters: "customer_clusters",
  sessions: "sessions",
  incomings: "incomings",
  sessionDeliveries: "session_deliveries",
  customerVisits: "customer_visits",
  savedRoutes: "saved_routes",
  passwordResetTokens: "password_reset_tokens",
};

function toDate(v: any): Date {
  if (v == null) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function mapRow(table: string, row: any): any {
  switch (table) {
    case "users":
      return {
        id: row.id || generateId(), name: row.name, email: row.email, password: row.password,
        role: row.role || "courier",
        isActive: row.is_active ?? row.isActive ?? false,
        lastActiveAt: toDate(row.last_active_at ?? row.lastActiveAt ?? null),
        createdAt: toDate(row.created_at ?? row.createdAt),
        updatedAt: toDate(row.updated_at ?? row.updatedAt),
      };
    case "clusters":
      return {
        id: row.id || generateId(), name: row.name, notes: row.notes,
        createdAt: toDate(row.created_at ?? row.createdAt),
        updatedAt: toDate(row.updated_at ?? row.updatedAt),
      };
    case "customers":
      return {
        id: row.id || generateId(), name: row.name,
        phoneNumber: row.phoneNumber ?? row.phone_number,
        address: row.address,
        latitude: row.latitude, longitude: row.longitude,
        housePictureUrl: row.housePictureUrl ?? row.house_picture_url,
        notes: row.notes,
        createdAt: toDate(row.created_at ?? row.createdAt),
        updatedAt: toDate(row.updated_at ?? row.updatedAt),
      };
    case "customerClusters":
      return {
        customerId: row.customerId || row.customer_id,
        clusterId: row.clusterId || row.cluster_id,
      };
    case "sessions":
      return {
        id: row.id || generateId(), userId: row.userId || row.user_id,
        date: row.date,
        totalPackages: row.totalPackages ?? row.total_packages ?? "0",
        deliveredPackages: row.deliveredPackages ?? row.delivered_packages ?? "0",
        createdAt: toDate(row.created_at ?? row.createdAt),
        updatedAt: toDate(row.updated_at ?? row.updatedAt),
      };
    case "incomings":
      return {
        id: row.id || generateId(), sessionId: row.sessionId || row.session_id,
        time: toDate(row.time), packages: row.packages,
        createdAt: toDate(row.created_at ?? row.createdAt),
      };
    case "sessionDeliveries":
      return {
        id: row.id || generateId(), sessionId: row.sessionId || row.session_id,
        incomingId: row.incomingId || row.incoming_id,
        customerId: row.customerId || row.customer_id,
        packages: row.packages ?? "1", status: row.status ?? "pending",
        createdAt: toDate(row.created_at ?? row.createdAt),
      };
    case "customerVisits":
      return {
        id: row.id || generateId(), customerId: row.customerId || row.customer_id,
        userId: row.userId ?? row.user_id, userName: row.userName ?? row.user_name,
        visitedAt: toDate(row.visited_at ?? row.visitedAt),
        checkedOutAt: row.checked_out_at ?? row.checkedOutAt ? toDate(row.checked_out_at ?? row.checkedOutAt) : null,
        notes: row.notes,
      };
    case "savedRoutes":
      return {
        id: row.id || generateId(), userId: row.userId || row.user_id,
        name: row.name, customerIds: row.customerIds ?? row.customer_ids,
        startLat: row.startLat ?? row.start_lat, startLng: row.startLng ?? row.start_lng,
        endLat: row.endLat ?? row.end_lat, endLng: row.endLng ?? row.end_lng,
        createdAt: toDate(row.created_at ?? row.createdAt),
      };
    case "passwordResetTokens":
      return {
        id: row.id || generateId(), email: row.email,
        token: row.token, expires: toDate(row.expires),
      };
    default:
      return row;
  }
}

function getTableRef(table: string): any {
  switch (table) {
    case "users": return users;
    case "clusters": return clusters;
    case "customers": return customers;
    case "customerClusters": return customerClusters;
    case "sessions": return sessions;
    case "incomings": return incomings;
    case "sessionDeliveries": return sessionDeliveries;
    case "customerVisits": return customerVisits;
    case "savedRoutes": return savedRoutes;
    case "passwordResetTokens": return passwordResetTokens;
    default: throw new Error(`Unknown table: ${table}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Consistent snapshot: all SELECTs in a single transaction
    const backup = await db.transaction(async (tx: any) => {
      const [usr, cust, cl, cc, vis, ses, inc, sdel, sroute, prt] = await Promise.all([
        tx.execute(sql`SELECT * FROM users`),
        tx.execute(sql`SELECT * FROM customers`),
        tx.execute(sql`SELECT * FROM clusters`),
        tx.execute(sql`SELECT * FROM customer_clusters`),
        tx.execute(sql`SELECT * FROM customer_visits`),
        tx.execute(sql`SELECT * FROM sessions`),
        tx.execute(sql`SELECT * FROM incomings`),
        tx.execute(sql`SELECT * FROM session_deliveries`),
        tx.execute(sql`SELECT * FROM saved_routes`),
        tx.execute(sql`SELECT * FROM password_reset_tokens`),
      ]);

      return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          users: Array.isArray(usr) ? usr : [],
          customers: Array.isArray(cust) ? cust : [],
          clusters: Array.isArray(cl) ? cl : [],
          customerClusters: Array.isArray(cc) ? cc : [],
          customerVisits: Array.isArray(vis) ? vis : [],
          sessions: Array.isArray(ses) ? ses : [],
          incomings: Array.isArray(inc) ? inc : [],
          sessionDeliveries: Array.isArray(sdel) ? sdel : [],
          savedRoutes: Array.isArray(sroute) ? sroute : [],
          passwordResetTokens: Array.isArray(prt) ? prt : [],
        },
      };
    });

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

async function restoreTable(tx: any, table: string, rows: any[]): Promise<number> {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const mapped = rows.map((r) => mapRow(table, r));
  const ref = getTableRef(table);
  await tx.insert(ref).values(mapped).onConflictDoNothing();
  return rows.length;
}

async function disableFkChecks(): Promise<boolean> {
  try {
    await db.execute(sql`SET session_replication_role = replica`);
    return true;
  } catch {
    return false;
  }
}

async function enableFkChecks() {
  try {
    await db.execute(sql`SET session_replication_role = origin`);
  } catch {
    // Best-effort
  }
}

export async function POST(req: NextRequest) {
  let fkDisabled = false;
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    let totalRestored = 0;

    // Single-table mode
    if (body.table && Array.isArray(body.rows)) {
      fkDisabled = await disableFkChecks();
      try {
        await db.transaction(async (tx: any) => {
          totalRestored = await restoreTable(tx, body.table, body.rows);
        });
      } finally {
        if (fkDisabled) await enableFkChecks();
      }
      return NextResponse.json({
        message: `Restored ${totalRestored} records in ${body.table}.`,
        table: body.table,
        restored: totalRestored,
      });
    }

    if (!body?.data) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    // Full restore mode
    fkDisabled = await disableFkChecks();
    try {
      await db.transaction(async (tx: any) => {
        // Optionally clear existing data
        if (body.truncate) {
          const reversed = [...ALL_TABLES].reverse();
          const truncateList = sql.join(
            reversed.map((t) => sql.identifier(TABLE_SQL_NAMES[t])),
            sql`, `,
          );
          await tx.execute(sql`TRUNCATE ${truncateList} CASCADE`);
        }

        const { users: usrData, customers: custData, clusters: clData, customerClusters: ccData, customerVisits: visData, sessions: sesData, incomings: incData, sessionDeliveries: sdelData, savedRoutes: srouteData, passwordResetTokens: prtData } = body.data;

        for (const [table, data] of Object.entries({
          users: usrData,
          clusters: clData,
          customers: custData,
          customerClusters: ccData,
          sessions: sesData,
          incomings: incData,
          sessionDeliveries: sdelData,
          customerVisits: visData,
          savedRoutes: srouteData,
          passwordResetTokens: prtData,
        })) {
          totalRestored += await restoreTable(tx, table, data as any[]);
        }
      });
    } finally {
      if (fkDisabled) await enableFkChecks();
    }

    await logActivity({
      userId: token.id as string, userName: token.name as string,
      action: "RESTORE_EXECUTED",
      details: `Restored ${totalRestored} records from backup.${body.truncate ? " (cleared existing data)" : ""}`,
    });

    return NextResponse.json({ message: `Restored ${totalRestored} records.` });
  } catch (error: any) {
    await logError({ errorName: "RestoreError", errorMessage: error.message, stackTrace: error.stack });
    return NextResponse.json({ error: error.message || "Restore failed" }, { status: 500 });
  }
}
