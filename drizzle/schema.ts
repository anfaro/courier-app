import { pgTable, serial, varchar, text, numeric, timestamp, unique, foreignKey, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 50 }),
	address: text().notNull(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	housePictureUrl: text("house_picture_url"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 256 }).notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	unique("password_reset_tokens_token_unique").on(table.token),
]);

export const clusters = pgTable("clusters", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const deliveries = pgTable("deliveries", {
	id: serial().primaryKey().notNull(),
	waybillNumber: varchar("waybill_number", { length: 256 }).notNull(),
	customerId: integer("customer_id"),
	proofOfDeliveryUrl: text("proof_of_delivery_url"),
	status: varchar({ length: 50 }).default('Pending'),
	codAmount: integer("cod_amount").default(0),
	receiverName: varchar("receiver_name", { length: 256 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "deliveries_customer_id_customers_id_fk"
		}).onDelete("cascade"),
	unique("deliveries_waybill_number_unique").on(table.waybillNumber),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }),
	email: varchar({ length: 256 }).notNull(),
	password: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	role: varchar({ length: 50 }).default('courier').notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const logs = pgTable("logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	userName: varchar("user_name", { length: 256 }),
	action: varchar({ length: 100 }).notNull(),
	details: text(),
	targetId: varchar("target_id", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "logs_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const customerClusters = pgTable("customer_clusters", {
	customerId: integer("customer_id").notNull(),
	clusterId: integer("cluster_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clusterId],
			foreignColumns: [clusters.id],
			name: "customer_clusters_cluster_id_clusters_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_clusters_customer_id_customers_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.customerId, table.clusterId], name: "customer_clusters_customer_id_cluster_id_pk"}),
]);
