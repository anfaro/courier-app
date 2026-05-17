"use client";

import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] mx-4 sm:mx-6 mt-4 items-center justify-center rounded-[32px] bg-card border border-card-border shadow-sm">
      <span className="animate-pulse font-bold text-gray-400 text-lg">Initializing Map Engine...</span>
    </div>
  ),
});

export default function MapClientWrapper({ deliveries, clusters }: { deliveries: any[]; clusters: any[] }) {
  return <DynamicMap deliveries={deliveries} clusters={clusters} />;
}
