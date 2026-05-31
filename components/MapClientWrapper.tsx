"use client";

import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("@/components/CustomerSelectionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card">
      <span className="animate-pulse font-bold text-gray-400 text-lg">Initializing Map Engine...</span>
    </div>
  ),
});

export default function MapClientWrapper({ customers, clusters }: { customers: any[]; clusters: any[] }) {
  return <DynamicMap customers={customers} clusters={clusters} />;
}
