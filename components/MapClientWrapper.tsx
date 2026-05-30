"use client";

import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center rounded-[32px] bg-card border border-card-border shadow-sm">
      <span className="animate-pulse font-bold text-gray-400 text-lg">Initializing Map Engine...</span>
    </div>
  ),
});

export default function MapClientWrapper({ customers, clusters }: { customers: any[]; clusters: any[] }) {
  return <DynamicMap customers={customers} clusters={clusters} />;
}
