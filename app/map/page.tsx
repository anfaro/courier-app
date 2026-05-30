export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { customers, clusters } from "@/lib/schema";
import { asc, isNotNull, and } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import CustomerSelectionMap from "@/components/CustomerSelectionMap";

export default async function MapPage() {
  const [allCustomers, allClusters] = await Promise.all([
    db.query.customers.findMany({
      where: and(isNotNull(customers.latitude), isNotNull(customers.longitude)),
      with: {
        clusters: {
          with: {
            cluster: true,
          },
        },
      },
      limit: 500,
    }),
    db.query.clusters.findMany({
      orderBy: [asc(clusters.name)],
    }),
  ]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Intelligent Routing</h1>
        <p className="text-[14px] font-medium text-secondary mt-1">Select customers to visit and find the best route.</p>

        <div className="mt-6">
          <CustomerSelectionMap customers={allCustomers} clusters={allClusters} />
        </div>
      </main>
    </div>
  );
}
