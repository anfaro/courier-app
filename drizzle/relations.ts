import { relations } from "drizzle-orm/relations";
import { customers, deliveries, users, logs, clusters, customerClusters } from "./schema";

export const deliveriesRelations = relations(deliveries, ({one}) => ({
	customer: one(customers, {
		fields: [deliveries.customerId],
		references: [customers.id]
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	deliveries: many(deliveries),
	customerClusters: many(customerClusters),
}));

export const logsRelations = relations(logs, ({one}) => ({
	user: one(users, {
		fields: [logs.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	logs: many(logs),
}));

export const customerClustersRelations = relations(customerClusters, ({one}) => ({
	cluster: one(clusters, {
		fields: [customerClusters.clusterId],
		references: [clusters.id]
	}),
	customer: one(customers, {
		fields: [customerClusters.customerId],
		references: [customers.id]
	}),
}));

export const clustersRelations = relations(clusters, ({many}) => ({
	customerClusters: many(customerClusters),
}));