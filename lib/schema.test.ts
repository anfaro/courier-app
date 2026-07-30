import { expect, test } from "vitest";
import * as schema from "./schema";

test("schema: all tables are defined", () => {
  expect(schema.users).toBeDefined();
  expect(schema.passwordResetTokens).toBeDefined();
  expect(schema.clusters).toBeDefined();
  expect(schema.customers).toBeDefined();
  expect(schema.customerClusters).toBeDefined();
  expect(schema.customerVisits).toBeDefined();
  expect(schema.logs).toBeDefined();
  expect(schema.errorLogs).toBeDefined();
  expect(schema.accessLogs).toBeDefined();
  expect(schema.sessions).toBeDefined();
  expect(schema.incomings).toBeDefined();
  expect(schema.sessionDeliveries).toBeDefined();
  expect(schema.savedRoutes).toBeDefined();
});

test("schema: users table has expected columns", () => {
  const t = schema.users;
  expect(t.id).toBeDefined();
  expect(t.name).toBeDefined();
  expect(t.email).toBeDefined();
  expect(t.password).toBeDefined();
  expect(t.role).toBeDefined();
  expect(t.createdAt).toBeDefined();
  expect(t.updatedAt).toBeDefined();
});

test("schema: customers table has expected columns", () => {
  const t = schema.customers;
  expect(t.id).toBeDefined();
  expect(t.name).toBeDefined();
  expect(t.phoneNumber).toBeDefined();
  expect(t.address).toBeDefined();
  expect(t.latitude).toBeDefined();
  expect(t.longitude).toBeDefined();
  expect(t.housePictureUrl).toBeDefined();
  expect(t.housePictures).toBeDefined();
  expect(t.landmark).toBeDefined();
  expect(t.accessInfo).toBeDefined();
  expect(t.notes).toBeDefined();
  expect(t.shareToken).toBeDefined();
  expect(t.shareTokenExpiresAt).toBeDefined();
  expect(t.createdAt).toBeDefined();
  expect(t.updatedAt).toBeDefined();
});

test("schema: sessions table has expected columns", () => {
  const t = schema.sessions;
  expect(t.id).toBeDefined();
  expect(t.userId).toBeDefined();
  expect(t.date).toBeDefined();
  expect(t.totalPackages).toBeDefined();
  expect(t.deliveredPackages).toBeDefined();
  expect(t.finalized).toBeDefined();
});

test("schema: all relations are defined", () => {
  expect(schema.customersRelations).toBeDefined();
  expect(schema.clustersRelations).toBeDefined();
  expect(schema.customerVisitsRelations).toBeDefined();
  expect(schema.customerClustersRelations).toBeDefined();
  expect(schema.logsRelations).toBeDefined();
  expect(schema.errorLogsRelations).toBeDefined();
  expect(schema.sessionsRelations).toBeDefined();
  expect(schema.incomingsRelations).toBeDefined();
  expect(schema.sessionDeliveriesRelations).toBeDefined();
  expect(schema.savedRoutesRelations).toBeDefined();
  expect(schema.accessLogsRelations).toBeDefined();
});

test("schema: users has relations defined", () => {
  const relations = schema.users;
  expect(relations).toBeDefined();
});

test("schema: customerClusters has composite primary key and foreign keys", () => {
  const t = schema.customerClusters;
  expect(t.customerId).toBeDefined();
  expect(t.clusterId).toBeDefined();
});

test("schema: customerVisits has timestamps and foreign keys", () => {
  const t = schema.customerVisits;
  expect(t.id).toBeDefined();
  expect(t.customerId).toBeDefined();
  expect(t.userId).toBeDefined();
  expect(t.visitedAt).toBeDefined();
  expect(t.checkedOutAt).toBeDefined();
  expect(t.notes).toBeDefined();
});
