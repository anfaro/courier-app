// lib/schema.test.ts
import { expect, test } from "vitest"; // Assuming Vitest for testing Drizzle schemas
import * as schema from "./schema";

// Helper to check if a table has specific columns with expected types/properties
function checkTableColumns(tableName: string, table: any, expectedColumns: Record<string, any>) {
  for (const columnName in expectedColumns) {
    expect(table[columnName]).toBeDefined();
    expect(table[columnName].dataType).toBe(expectedColumns[columnName].dataType);
    if (expectedColumns[columnName].isPrimaryKey) {
      expect(table[columnName].primaryKey).toBe(true);
    }
    if (expectedColumns[columnName].isNotNull) {
      expect(table[columnName].notNull).toBe(true);
    }
    if (expectedColumns[columnName].isUnique) {
      expect(table[columnName].unique).toBe(true);
    }
    if (expectedColumns[columnName].defaultValue !== undefined) {
      expect(table[columnName].defaultTo).toBe(expectedColumns[columnName].defaultValue);
    }
  }
}

test("schema: users table structure", () => {
  const users = schema.users;
  expect(users).toBeDefined();
  expect(users.name).toBeDefined();
  expect(users.email).toBeDefined();
  expect(users.password).toBeDefined();
  expect(users.role).toBeDefined();
  expect(users.createdAt).toBeDefined();
  expect(users.updatedAt).toBeDefined();

  // Example of checking specific properties
  expect(users.id.primaryKey).toBe(true);
  expect(users.email.notNull).toBe(true);
  expect(users.email.unique).toBe(true);
  expect(users.role.defaultTo).toBe("courier");
});

test("schema: passwordResetTokens table structure", () => {
  const passwordResetTokens = schema.passwordResetTokens;
  expect(passwordResetTokens).toBeDefined();
  expect(passwordResetTokens.id.primaryKey).toBe(true);
  expect(passwordResetTokens.email.notNull).toBe(true);
  expect(passwordResetTokens.token.notNull).toBe(true);
  expect(passwordResetTokens.token.unique).toBe(true);
  expect(passwordResetTokens.expires).toBeDefined();
});

test("schema: clusters table structure", () => {
  const clusters = schema.clusters;
  expect(clusters).toBeDefined();
  expect(clusters.id.primaryKey).toBe(true);
  expect(clusters.name.notNull).toBe(true);
});

test("schema: customers table structure", () => {
  const customers = schema.customers;
  expect(customers).toBeDefined();
  expect(customers.id.primaryKey).toBe(true);
  expect(customers.name.notNull).toBe(true);
  expect(customers.address.notNull).toBe(true);
});

test("schema: deliveries table structure", () => {
  const deliveries = schema.deliveries;
  expect(deliveries).toBeDefined();
  expect(deliveries.id.primaryKey).toBe(true);
  expect(deliveries.waybillNumber.notNull).toBe(true);
  expect(deliveries.waybillNumber.unique).toBe(true);
  expect(deliveries.customerId).toBeDefined();
  expect(deliveries.status.defaultTo).toBe("Pending");
  expect(deliveries.codAmount.defaultTo).toBe("0");
});

test("schema: customerClusters table structure", () => {
  const customerClusters = schema.customerClusters;
  expect(customerClusters).toBeDefined();
  expect(customerClusters.customerId.notNull).toBe(true);
  expect(customerClusters.clusterId.notNull).toBe(true);
  // Check composite primary key
  expect(customerClusters.pk).toBeDefined();
});

test("schema: logs table structure", () => {
  const logs = schema.logs;
  expect(logs).toBeDefined();
  expect(logs.id.primaryKey).toBe(true);
  expect(logs.action.notNull).toBe(true);
  expect(logs.userId).toBeDefined(); // Foreign key reference
});

test("schema: errorLogs table structure", () => {
  const errorLogs = schema.errorLogs;
  expect(errorLogs).toBeDefined();
  expect(errorLogs.id.primaryKey).toBe(true);
  expect(errorLogs.errorName).toBeDefined();
  expect(errorLogs.errorMessage).toBeDefined();
  expect(errorLogs.stackTrace).toBeDefined();
  expect(errorLogs.pathname).toBeDefined();
  expect(errorLogs.userId).toBeDefined(); // Foreign key reference
});

test("schema: accessLogs table structure", () => {
  const accessLogs = schema.accessLogs;
  expect(accessLogs).toBeDefined();
  expect(accessLogs.id.primaryKey).toBe(true);
  expect(accessLogs.pathname.notNull).toBe(true);
  expect(accessLogs.method.notNull).toBe(true);
  expect(accessLogs.ipAddress).toBeDefined();
  expect(accessLogs.userId).toBeDefined(); // Foreign key reference
});

// --- Relation Tests ---

test("schema: relations - customers to deliveries", () => {
  const customers = schema.customers;
  const deliveries = schema.deliveries;
  const relations = schema.customersRelations;

  expect(relations).toBeDefined();
  expect(relations.deliveries).toBeDefined();
  // This checks that the 'deliveries' relation is defined on the customers schema
  // Further checks could involve ensuring the foreign key on deliveries.customerId points correctly
  expect(deliveries.customerId).toBeDefined(); // Ensure the FK column exists on deliveries
  expect(deliveries.customerId.references).toBeDefined();
  expect(deliveries.customerId.references.table).toBe(customers); // Check if it references the customers table
});

test("schema: relations - clusters to customerClusters", () => {
  const clusters = schema.clusters;
  const customerClusters = schema.customerClusters;
  const relations = schema.clustersRelations;

  expect(relations).toBeDefined();
  expect(relations.customers).toBeDefined();
  // Check if the customerClusters table has a foreign key referencing clusters.id
  expect(customerClusters.clusterId).toBeDefined();
  expect(customerClusters.clusterId.references).toBeDefined();
  expect(customerClusters.clusterId.references.table).toBe(clusters);
});

test("schema: relations - customerClusters to customer and cluster", () => {
  const customerClusters = schema.customerClusters;
  const customers = schema.customers;
  const clusters = schema.clusters;
  const relations = schema.customerClustersRelations;

  expect(relations).toBeDefined();
  expect(relations.customer).toBeDefined();
  expect(relations.cluster).toBeDefined();

  // Check customer relation
  expect(customerClusters.customerId).toBeDefined();
  expect(customerClusters.customerId.references).toBeDefined();
  expect(customerClusters.customerId.references.table).toBe(customers);

  // Check cluster relation
  expect(customerClusters.clusterId).toBeDefined();
  expect(customerClusters.clusterId.references).toBeDefined();
  expect(customerClusters.clusterId.references.table).toBe(clusters);
});

test("schema: relations - deliveries to customer", () => {
  const deliveries = schema.deliveries;
  const customers = schema.customers;
  const relations = schema.deliveriesRelations;

  expect(relations).toBeDefined();
  expect(relations.customer).toBeDefined();
  // Check if the deliveries table has a foreign key referencing customers.id
  expect(deliveries.customerId).toBeDefined();
  expect(deliveries.customerId.references).toBeDefined();
  expect(deliveries.customerId.references.table).toBe(customers);
});

test("schema: relations - logs to user", () => {
  const logs = schema.logs;
  const users = schema.users;
  const relations = schema.logsRelations;

  expect(relations).toBeDefined();
  expect(relations.user).toBeDefined();
  expect(logs.userId).toBeDefined();
  expect(logs.userId.references).toBeDefined();
  expect(logs.userId.references.table).toBe(users);
});

test("schema: relations - errorLogs to user", () => {
  const errorLogs = schema.errorLogs;
  const users = schema.users;
  const relations = schema.errorLogsRelations;

  expect(relations).toBeDefined();
  expect(relations.user).toBeDefined();
  expect(errorLogs.userId).toBeDefined();
  expect(errorLogs.userId.references).toBeDefined();
  expect(errorLogs.userId.references.table).toBe(users);
});

test("schema: relations - accessLogs to user", () => {
  const accessLogs = schema.accessLogs;
  const users = schema.users;
  const relations = schema.accessLogsRelations;

  expect(relations).toBeDefined();
  expect(relations.user).toBeDefined();
  expect(accessLogs.userId).toBeDefined();
  expect(accessLogs.userId.references).toBeDefined();
  expect(accessLogs.userId.references.table).toBe(users);
});
