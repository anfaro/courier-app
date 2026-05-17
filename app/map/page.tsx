export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deliveries, clusters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import MapClientWrapper from "@/components/MapClientWrapper";

export default async function MapDashboardPage() {
  const [pendingDeliveries, allClusters] = await Promise.all([
    db.query.deliveries.findMany({
      where: eq(deliveries.status, "Pending"),
      with: {
        customer: {
          with: {
            clusters: {
              with: {
                cluster: true,
              },
            },
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
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Intelligent Routing</h1>
        <p className="text-[14px] font-medium text-secondary mt-1">Optimize your field delivery sequence.</p>

        <div className="mt-6 rounded-[24px] bg-blue-50 dark:bg-blue-900/20 p-5 border border-blue-100 dark:border-blue-800 flex items-start gap-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 font-bold">
            🚀
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-200 text-[15px]">Smart Route Planner</h3>
            <p className="text-[13px] text-blue-700 dark:text-blue-400 mt-1 font-medium leading-relaxed">
              1. Paste a Google Maps link for your <strong>Start</strong> (e.g., Warehouse) and <strong>End</strong> point.<br/>
              2. Tap <strong>Calculate</strong> to find the shortest sequence between all pending deliveries.<br/>
              3. The blue dashed line shows your optimized path!
            </p>
          </div>
        </div>

        <div className="mt-6">
          <MapClientWrapper deliveries={pendingDeliveries} clusters={allClusters} />
        </div>
      </main>
    </div>
  );
}
