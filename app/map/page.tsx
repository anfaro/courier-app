// app/map/page.tsx

import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Breadcrumbs from "@/components/Breadcrumbs";
import MapClientWrapper from "@/components/MapClientWrapper";

export default async function MapDashboardPage() {
  // 1. Fetch only "Pending" deliveries and pull in their customer data for coordinates
  const pendingDeliveries = await db.query.deliveries.findMany({
    where: eq(deliveries.status, "Pending"),
    with: {
      customer: true, // We need this to get customer.latitude & customer.longitude
    },
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Fixed Header & Breadcrumbs */}
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">

        <div className="pt-4 px-4 sm:px-6 mb-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Intelligent Routing</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Optimize your field delivery sequence.</p>
          
          {/* Moved: Smart Route Planner Note */}
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
        </div>

        {/* Render the Map via our safe Client Wrapper */}
        <MapClientWrapper deliveries={pendingDeliveries} />

      </div>
    </div>
  );
}
