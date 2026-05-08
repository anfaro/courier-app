// app/deliveries/page.tsx

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";

// 1. We extract the main logic into a Content component
function DeliveriesDashboardContent() {
  const searchParams = useSearchParams();

  // Read the ?filter= parameter from the URL, default to "All" if it doesn't exist
  const initialFilter = (searchParams.get("filter") as "All" | "Pending" | "Delivered" | "Failed") || "All";

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Delivered" | "Failed">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/deliveries");
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      const data = await res.json();
      setDeliveries(data.deliveries || data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesFilter = filter === "All" ? true : d.status === filter;

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (d.waybillNumber && d.waybillNumber.toLowerCase().includes(searchLower)) ||
      (d.receiverName && d.receiverName.toLowerCase().includes(searchLower)) ||
      (d.customer?.name && d.customer.name.toLowerCase().includes(searchLower)) ||
      (d.customerName && d.customerName.toLowerCase().includes(searchLower));

    return matchesFilter && matchesSearch;
  });

  const pendingCount = deliveries.filter(d => d.status === "Pending").length;
  const totalCodPending = deliveries
    .filter(d => d.status === "Pending")
    .reduce((sum, d) => sum + (parseInt(d.codAmount) || 0), 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 flex-1 overflow-y-auto custom-scrollbar relative pb-32">

      {/* --- TOP SECTION --- */}
      <div className="pt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Deliveries</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">Manage your active waybills.</p>
        </div>
      </div>

      <Link href="/deliveries/new" className="block mb-6 group">
        <div className="relative overflow-hidden rounded-[32px] bg-blue-600 p-6 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="mb-1 block text-[12px] font-black uppercase tracking-widest text-blue-200">Global Entry Hub</span>
              <h2 className="text-2xl font-black text-white">Add New Deliveries</h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 shadow-md transition-transform group-hover:rotate-90">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Waybills</p>
          <p className="text-[22px] leading-none font-black text-gray-900">{pendingCount}</p>
        </div>

        <div className="flex-[1.2] rounded-[24px] bg-orange-50 p-4 shadow-sm border border-orange-100 flex flex-col justify-center overflow-hidden">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-1">Pending COD</p>
          <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="text-[14px] font-bold text-orange-600">Rp</span>
            <span className="text-[20px] leading-none font-black text-orange-700 tracking-tight">
              {totalCodPending.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* --- STICKY SEARCH & FILTERS --- */}
      <div className="sticky top-0 z-20 bg-[#F8F9FA] pt-2 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">

        {/* SEARCH BAR */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search waybill or receiver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[24px] border border-gray-100 bg-white pl-11 pr-10 py-3.5 text-[15px] font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* FILTER PILLS */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
          {["All", "Pending", "Delivered", "Failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 text-[14px] font-bold transition-all active:scale-95 ${filter === f
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENT LIST --- */}
      <div className="pt-2">
        {error && (
          <div className="mb-4 rounded-[24px] bg-red-50 p-4 text-[14px] font-bold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-[32px] bg-white border border-gray-100 mt-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl animate-spin">⏳</span>
            <p className="mt-4 text-[14px] font-bold text-gray-400">Loading deliveries...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-[32px] bg-white border border-gray-100 text-center px-6 shadow-sm mt-2">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-2xl">
              {searchQuery ? "🔍" : "📦"}
            </div>
            <h3 className="text-lg font-black text-gray-900">
              {searchQuery ? "No Results Found" : `No ${filter !== "All" ? filter : ""} Deliveries`}
            </h3>
            <p className="mt-1 text-[13px] font-medium text-gray-500">
              {searchQuery
                ? "Try searching for a different waybill number."
                : filter === "All"
                  ? "Click the blue button above to get started!"
                  : `There are no waybills with the status '${filter}'.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeliveries.map((delivery) => (
              <Link
                href={`/deliveries/${delivery.id}`}
                key={delivery.id}
                className="block rounded-[28px] bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[18px] font-black text-gray-900">{delivery.waybillNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                        👤 {delivery.customer?.name || delivery.customerName || "Unknown Customer"}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${delivery.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                    delivery.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {delivery.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="overflow-hidden pr-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Receiver</p>
                    <p className="text-[14px] font-bold text-gray-800 truncate">{delivery.receiverName || "-"}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">COD Amount</p>
                    <p className={`text-[16px] font-black flex items-baseline justify-end gap-1 ${parseInt(delivery.codAmount) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                      <span className="text-[11px]">Rp</span>
                      {parseInt(delivery.codAmount || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// 2. The main page component wraps the content in Suspense
export default function DeliveriesPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] overflow-hidden">
      {/* --- FIXED HEADER --- */}
      <div className="shrink-0 z-30 bg-[#F8F9FA]">
        <Header />
        <Breadcrumbs />
      </div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-400 font-bold animate-pulse">Loading dashboard...</span>
        </div>
      }>
        <DeliveriesDashboardContent />
      </Suspense>
    </div>
  );
}

