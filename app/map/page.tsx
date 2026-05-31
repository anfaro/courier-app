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
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>
      <main className="flex-1 min-h-0 relative">
        <MapClientWrapper customers={allCustomers} clusters={allClusters} />
      </main>
    </div>
  );
}
