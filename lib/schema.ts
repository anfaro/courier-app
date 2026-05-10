// lib/schema.ts
import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
  primaryKey
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull().unique(),
  password: text("password").notNull(),
  // NEW: Role column with a strict default
  role: varchar("role", { length: 50 }).default("courier").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NEW: Table to hold temporary password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(), // To ensure tokens are only valid for a short time
});

export const clusters = pgTable("clusters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address").notNull(),
  // Using decimal for high-precision Google Maps coordinates
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // NEW: Store the URL of the uploaded house picture
  housePictureUrl: text("house_picture_url"),
  // Link this customer to a specific cluster
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  waybillNumber: varchar("waybill_number", { length: 256 }).notNull().unique(),

  // THE FIX: Changed to "cascade"
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),

  proofOfDeliveryUrl: text("proof_of_delivery_url"),
  status: varchar("status", { length: 50 }).default("Pending"),
  codAmount: integer("cod_amount").default(0),
  receiverName: varchar("receiver_name", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customerClusters = pgTable("customer_clusters", {
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  clusterId: integer("cluster_id")
    .notNull()
    .references(() => clusters.id, { onDelete: "cascade" }),
}, (t) => ({
  // The primary key is the combination of both, preventing duplicates!
  pk: primaryKey({ columns: [t.customerId, t.clusterId] }),
}));

// NEW: Drizzle Relations (This makes querying incredibly easy later)
export const customersRelations = relations(customers, ({ many }) => ({
  clusters: many(customerClusters),
  deliveries: many(deliveries), // Assuming you have a deliveries relation
}));

export const clustersRelations = relations(clusters, ({ many }) => ({
  customers: many(customerClusters),
}));

export const customerClustersRelations = relations(customerClusters, ({ one }) => ({
  customer: one(customers, {
    fields: [customerClusters.customerId],
    references: [customers.id],
  }),
  cluster: one(clusters, {
    fields: [customerClusters.clusterId],
    references: [clusters.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  customer: one(customers, {
    fields: [deliveries.customerId],
    references: [customers.id],
  }),
}));

// ACTIVITY LOGS: Global system log to track changes and actions
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }), // Denormalized for fast reading
  action: varchar("action", { length: 100 }).notNull(), // e.g. "USER_CREATED", "DELIVERY_SAVE", "CUSTOMER_DELETE"
  details: text("details"), // JSON or descriptive string
  targetId: varchar("target_id", { length: 100 }), // e.g. The ID of the modified customer
  createdAt: timestamp("created_at").defaultNow(),
});

// ERROR LOGS: Capturing runtime exceptions and system failures
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  errorName: varchar("error_name", { length: 256 }),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  pathname: varchar("pathname", { length: 2048 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ACCESS LOGS: Tracking every hit to the application
export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  pathname: varchar("pathname", { length: 2048 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for logs
export const logsRelations = relations(logs, ({ one }) => ({
  user: one(users, {
    fields: [logs.userId],
    references: [users.id],
  }),
}));

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  user: one(users, {
    fields: [accessLogs.userId],
    references: [users.id],
  }),
}));
