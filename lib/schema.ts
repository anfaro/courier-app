// lib/schema.ts
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 7 }).primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).default("courier").notNull(),
  isActive: boolean("is_active").default(false),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 7 }).primaryKey(),
  email: varchar("email", { length: 256 }).notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});

export const clusters = pgTable("clusters", {
  id: varchar("id", { length: 7 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id", { length: 7 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  housePictureUrl: text("house_picture_url"),
  notes: text("notes"),
  shareToken: varchar("share_token", { length: 16 }),
  shareTokenExpiresAt: timestamp("share_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("customers_created_at_idx").on(table.createdAt),
  nameIdx: index("customers_name_idx").on(table.name),
  phoneIdx: index("customers_phone_idx").on(table.phoneNumber),
  shareTokenIdx: index("customers_share_token_idx").on(table.shareToken),
}));

export const customerClusters = pgTable("customer_clusters", {
  customerId: varchar("customer_id", { length: 7 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id", { length: 7 })
    .notNull()
    .references(() => clusters.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.customerId, t.clusterId] }),
}));

export const customerVisits = pgTable("customer_visits", {
  id: varchar("id", { length: 7 }).primaryKey(),
  customerId: varchar("customer_id", { length: 7 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 7 }).references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
  checkedOutAt: timestamp("checked_out_at"),
  notes: text("notes"),
}, (table) => ({
  customerIdIdx: index("visits_customer_id_idx").on(table.customerId),
  visitedAtIdx: index("visits_visited_at_idx").on(table.visitedAt),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  clusters: many(customerClusters),
  visits: many(customerVisits),
}));

export const clustersRelations = relations(clusters, ({ many }) => ({
  customers: many(customerClusters),
}));

export const customerVisitsRelations = relations(customerVisits, ({ one }) => ({
  customer: one(customers, {
    fields: [customerVisits.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [customerVisits.userId],
    references: [users.id],
  }),
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

export const logs = pgTable("logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }).references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  targetId: varchar("target_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("logs_created_at_idx").on(table.createdAt),
}));

export const errorLogs = pgTable("error_logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }).references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  errorName: varchar("error_name", { length: 256 }),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  pathname: varchar("pathname", { length: 2048 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("error_logs_created_at_idx").on(table.createdAt),
}));

export const accessLogs = pgTable("access_logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }).references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 256 }),
  pathname: varchar("pathname", { length: 2048 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("access_logs_created_at_idx").on(table.createdAt),
}));

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

export const savedRoutes = pgTable("saved_routes", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  customerIds: text("customer_ids").notNull(),
  startLat: varchar("start_lat", { length: 32 }),
  startLng: varchar("start_lng", { length: 32 }),
  endLat: varchar("end_lat", { length: 32 }),
  endLng: varchar("end_lng", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedRoutesRelations = relations(savedRoutes, ({ one }) => ({
  user: one(users, {
    fields: [savedRoutes.userId],
    references: [users.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  user: one(users, {
    fields: [accessLogs.userId],
    references: [users.id],
  }),
}));
