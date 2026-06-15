// lib/schema.ts
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 7 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).default("courier").notNull(),
  rate: integer("rate").default(1500).notNull(),
  targetSystem: boolean("target_system").default(true).notNull(),
  getGeocode: boolean("get_geocode").default(true).notNull(),
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
  visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow().notNull(),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
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

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  totalPackages: varchar("total_packages", { length: 10 }).default("0").notNull(),
  deliveredPackages: varchar("delivered_packages", { length: 10 }).default("0").notNull(),
  finalized: boolean("finalized").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdDateIdx: index("sessions_user_id_date_idx").on(table.userId, table.date),
}));

export const incomings = pgTable("incomings", {
  id: varchar("id", { length: 7 }).primaryKey(),
  sessionId: varchar("session_id", { length: 7 })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  time: timestamp("time").defaultNow().notNull(),
  packages: varchar("packages", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("incomings_session_id_idx").on(table.sessionId),
}));

export const sessionDeliveries = pgTable("session_deliveries", {
  id: varchar("id", { length: 7 }).primaryKey(),
  sessionId: varchar("session_id", { length: 7 })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  incomingId: varchar("incoming_id", { length: 7 })
    .notNull()
    .references(() => incomings.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id", { length: 7 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  packages: varchar("packages", { length: 10 }).default("1").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("deliveries_session_id_idx").on(table.sessionId),
  statusIdx: index("deliveries_status_idx").on(table.status),
  incomingIdIdx: index("deliveries_incoming_id_idx").on(table.incomingId),
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

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  incomings: many(incomings),
  deliveries: many(sessionDeliveries),
}));

export const incomingsRelations = relations(incomings, ({ one, many }) => ({
  session: one(sessions, {
    fields: [incomings.sessionId],
    references: [sessions.id],
  }),
  deliveries: many(sessionDeliveries),
}));

export const sessionDeliveriesRelations = relations(sessionDeliveries, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionDeliveries.sessionId],
    references: [sessions.id],
  }),
  incoming: one(incomings, {
    fields: [sessionDeliveries.incomingId],
    references: [incomings.id],
  }),
  customer: one(customers, {
    fields: [sessionDeliveries.customerId],
    references: [customers.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  user: one(users, {
    fields: [accessLogs.userId],
    references: [users.id],
  }),
}));
