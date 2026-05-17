import { pgTable, varchar, text, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 7 }).primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull(),
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
  token: text("token").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: varchar("id", { length: 7 }).primaryKey(),
  waybillNumber: varchar("waybill_number", { length: 256 }).notNull(),
  customerId: varchar("customer_id", { length: 7 }),
  proofOfDeliveryUrl: text("proof_of_delivery_url"),
  status: varchar("status", { length: 50 }).default("Pending"),
  codAmount: text("cod_amount").default("0"),
  receiverName: varchar("receiver_name", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customerClusters = pgTable("customer_clusters", {
  customerId: varchar("customer_id", { length: 7 }).notNull(),
  clusterId: varchar("cluster_id", { length: 7 }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.customerId, t.clusterId] }),
}));

export const logs = pgTable("logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }),
  userName: varchar("user_name", { length: 256 }),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  targetId: varchar("target_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const errorLogs = pgTable("error_logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }),
  userName: varchar("user_name", { length: 256 }),
  errorName: varchar("error_name", { length: 256 }),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  pathname: varchar("pathname", { length: 2048 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accessLogs = pgTable("access_logs", {
  id: varchar("id", { length: 7 }).primaryKey(),
  userId: varchar("user_id", { length: 7 }),
  userName: varchar("user_name", { length: 256 }),
  pathname: varchar("pathname", { length: 2048 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});
