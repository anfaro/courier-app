export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { customers, clusters } from "@/lib/schema";
import { isNotNull } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import MapClientWrapper from "@/components/MapClientWrapper";

export default async function MapDashboardPage() {
  const [allCustomers, allClusters] = await Promise.all([
    db.query.customers.findMany({
      where: isNotNull(customers.latitude),
      with: {
        clusters: {
          with: {
            cluster: true,
          },
        },
      },
      limit: 200,
    }),
    db.query.clusters.findMany({
      orderBy: (clusters, { asc }) => [asc(clusters.name)],
    }),
  ]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Route Planner</h1>
        <p className="text-[14px] font-medium text-secondary mt-1">Select customers to visit and generate the best route.</p>

        <div className="mt-6">
          <MapClientWrapper customers={allCustomers} clusters={allClusters} />
        </div>
      </main>
    </div>
  );
}
