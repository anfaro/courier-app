// app/map/page.tsx

import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Header from "@/components/header";
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
    <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] overflow-hidden">
      {/* Fixed Header & Breadcrumbs */}
      <div className="shrink-0 z-30 bg-[#F8F9FA]">
        <Header />
        <Breadcrumbs />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">

        <div className="pt-4 px-4 sm:px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Live Route</h1>
            <p className="text-[14px] font-medium text-gray-500 mt-1">Density map of active deliveries.</p>
          </div>
        </div>

        {/* Render the Map via our safe Client Wrapper */}
        <MapClientWrapper deliveries={pendingDeliveries} />

        {/* Legend / Info Below Map */}
        <div className="mx-4 sm:mx-6 mt-6 rounded-[24px] bg-blue-50 p-5 border border-blue-100 flex items-start gap-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-700 font-bold">
            ℹ️
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-[15px]">How to use this map</h3>
            <p className="text-[13px] text-blue-700 mt-1 font-medium leading-relaxed">
              Darker overlapping circles indicate high-density delivery zones. Tap any circle to view the customer name and open the digital receipt. Only pending deliveries with pinned GPS coordinates are shown.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

