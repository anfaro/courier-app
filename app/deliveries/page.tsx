// app/deliveries/page.tsx

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { useLanguage } from "@/components/LanguageProvider";

interface Delivery {
  id: string;
  waybillNumber: string;
  status: string;
  receiverName?: string;
  customerName?: string;
  createdAt: string;
  codAmount: string;
  customer?: {
    name: string;
  };
}

// 1. We extract the main logic into a Content component
function DeliveriesDashboardContent() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  const searchParams = useSearchParams();

  // Read the ?filter= parameter from the URL, default to "All" if it doesn't exist
  const initialFilter = (searchParams.get("filter") as "All" | "Pending" | "Delivered" | "Failed") || "All";

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Delivered" | "Failed">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // Management State
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = (session?.user as any)?.role === "superadmin";

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/deliveries");
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      const data = await res.json();
      setDeliveries(data.deliveries || data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const confirmed = await askConfirmation({
      title: `${t("admin.bulk_delete")}?`,
      message: `You are about to permanently delete ${selectedIds.length} waybills.`,
      confirmText: t("action.delete"),
      type: "danger"
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        const res = await fetch("/api/admin/deliveries/bulk-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        if (res.ok) {
          setDeliveries(prev => prev.filter(d => !selectedIds.includes(d.id)));
          showToast(`${selectedIds.length} waybills deleted.`, "success");
          setSelectedIds([]);
          setIsManagementMode(false);
        }
      } catch (err) {
        showToast("Failed to delete.", "error");
      } finally {
        setIsDeleting(false);
      }
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
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Deliveries</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Manage your active waybills.</p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => {
                setIsManagementMode(!isManagementMode);
                setSelectedIds([]);
              }}
              className={`btn-secondary !py-2.5 !px-5 ${isManagementMode ? 'bg-blue-600 !text-white' : ''}`}
            >
              {isManagementMode ? "Cancel" : "Manage"}
            </button>
          )}
        </div>
      </div>

      {isManagementMode && selectedIds.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-[24px] bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/50 animate-in fade-in slide-in-from-top-2">
          <span className="font-bold text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="btn-danger !py-2 !px-4 text-[13px]"
          >
            {isDeleting ? "..." : t("admin.bulk_delete")}
          </button>
        </div>
      )}

      {!isManagementMode && (
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
      )}

      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-[24px] bg-card p-4 shadow-sm border border-card-border flex flex-col justify-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Waybills</p>
          <p className="text-[22px] leading-none font-black text-primary">{pendingCount}</p>
        </div>

        <div className="flex-[1.2] rounded-[24px] bg-orange-50 dark:bg-orange-950/20 p-4 shadow-sm border border-orange-100 dark:border-orange-900/50 flex flex-col justify-center overflow-hidden">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 dark:text-orange-500 mb-1">Pending COD</p>
          <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="text-[14px] font-bold text-orange-600 dark:text-orange-400">Rp</span>
            <span className="text-[20px] leading-none font-black text-orange-700 dark:text-orange-300 tracking-tight">
              {totalCodPending.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* --- STICKY SEARCH & FILTERS --- */}
      <div className="sticky top-0 z-20 bg-background pt-2 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">

        {/* SEARCH BAR */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search waybill or receiver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[24px] border border-card-border bg-card pl-11 pr-10 py-3.5 text-[15px] font-medium text-primary shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-secondary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary hover:text-primary"
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
              className={`whitespace-nowrap px-6 py-2.5 text-[14px] font-bold transition-all active:scale-90 rounded-full ${filter === f
                ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
                : "bg-card text-secondary border border-card-border hover:bg-surface-hover active:bg-gray-200/50 dark:active:bg-slate-700/50 shadow-sm"
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
          <div className="mb-4 rounded-[24px] bg-red-50 dark:bg-red-950/20 p-4 text-[14px] font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-[32px] bg-card border border-card-border mt-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-2xl animate-spin">⏳</span>
            <p className="mt-4 text-[14px] font-bold text-secondary">Loading deliveries...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-[32px] bg-card border border-card-border text-center px-6 shadow-sm mt-2">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl">
              {searchQuery ? "🔍" : "📦"}
            </div>
            <h3 className="text-lg font-black text-primary">
              {searchQuery ? "No Results Found" : `No ${filter !== "All" ? filter : ""} Deliveries`}
            </h3>
            <p className="mt-1 text-[13px] font-medium text-secondary">
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
              <div
                key={delivery.id}
                onClick={() => isManagementMode && toggleSelection(delivery.id)}
                className={`block rounded-[28px] bg-card p-5 shadow-sm border transition-all ${
                  isManagementMode && selectedIds.includes(delivery.id)
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-card-border hover:border-blue-200 dark:hover:border-blue-800'
                } ${isManagementMode ? 'cursor-pointer' : 'active:scale-[0.98]'}`}
              >
                {!isManagementMode && (
                  <Link
                    href={`/deliveries/${delivery.id}`}
                    className="absolute inset-0 z-0"
                  />
                )}

                <div className="flex items-start justify-between mb-3 relative z-10 pointer-events-none">
                  <div className="flex items-start gap-3">
                    {isManagementMode && (
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(delivery.id)}
                          readOnly
                          className="h-5 w-5 rounded-lg border-card-border text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-[18px] font-black text-primary">{delivery.waybillNumber}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="inline-flex items-center w-fit gap-1 rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                          👤 {delivery.customer?.name || delivery.customerName || "Unknown Customer"}
                        </span>
                        <p className="text-[10px] font-medium text-secondary opacity-60 ml-1">
                          📅 {new Date(delivery.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${delivery.status === 'Pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                    delivery.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                    {delivery.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-card-border pt-4 relative z-10 pointer-events-none">
                  <div className="overflow-hidden pr-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Receiver</p>
                    <p className="text-[14px] font-bold text-primary truncate">{delivery.receiverName || "-"}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-secondary">COD Amount</p>
                    <p className={`text-[16px] font-black flex items-baseline justify-end gap-1 ${Number(delivery.codAmount || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-primary'}`}>
                      <span className="text-[11px]">Rp</span>
                      {Number(delivery.codAmount || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
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
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* --- FIXED HEADER --- */}
      <div className="shrink-0 z-30 bg-background">
        
        <Breadcrumbs />
      </div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="text-secondary font-bold animate-pulse">Loading dashboard...</span>
        </div>
      }>
        <DeliveriesDashboardContent />
      </Suspense>
    </div>
  );
}
