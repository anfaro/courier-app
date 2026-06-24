"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import Icon from "@/components/Icon";

const pageCache = new Map<string, { customers: any[]; hasMore: boolean; visitsMap?: Record<string, string>; ts: number }>();
const PAGE_CACHE_TTL = 60000;

const avatarGradients = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-purple-600 to-pink-700",
  "from-orange-500 to-rose-600",
  "from-cyan-600 to-blue-700",
  "from-violet-600 to-purple-700",
];

function CustomersListContent() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [visitsMap, setVisitsMap] = useState<Record<string, string>>({});
  const [allClusters, setAllClusters] = useState<any[]>([]);
  const [clusterFilter, setClusterFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "hasPin" | "noPin" | "visited">("all");
  const [sortBy, setSortBy] = useState("newest");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [jumpInput, setJumpInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  
  // Management State
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignClusterId, setAssignClusterId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const isSuperAdmin = (session?.user as any)?.role === "superadmin";

  const fetchCustomers = async (q: string, p: number) => {
    const cf = clusterFilter !== "all" ? clusterFilter : "";
    const cacheKey = `${q || "__all__"}:${p}:${pageSize}:${cf}:${sortBy}`;
    const cached = pageCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < PAGE_CACHE_TTL) {
      setAllCustomers(cached.customers);
      setHasMore(cached.hasMore);
      if (cached.visitsMap) setVisitsMap(cached.visitsMap);
      setIsLoading(false);
      setFetchError("");
      return;
    }

    setIsLoading(true);
    setFetchError("");
    try {
      if (q) {
        const url = `/api/customers/search?q=${encodeURIComponent(q)}`;
        const res = await fetchWithTimeout(url, {}, 60000);
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const data = await res.json();
        const list = data || [];
        pageCache.set(`${q}:0`, { customers: list, hasMore: false, ts: Date.now() });
        setAllCustomers(list);
        setHasMore(false);
      } else {
        const cfParam = clusterFilter !== "all" ? `&clusterId=${clusterFilter}` : "";
        const url = `/api/customers-page?limit=${pageSize}&offset=${p * pageSize}${cfParam}&sort=${sortBy}`;
        const res = await fetchWithTimeout(url, {}, 60000);
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const data = await res.json();
        const list = data.customers || [];
        const more = data.hasMore ?? false;
        if (data.visitsMap) setVisitsMap(data.visitsMap);
        if (data.clusters && allClusters.length === 0) setAllClusters(data.clusters);
        pageCache.set(cacheKey, { customers: list, hasMore: more, visitsMap: data.visitsMap, ts: Date.now() });
        setAllCustomers(list);
        setHasMore(more);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setFetchError("Request timed out. Check your connection.");
      } else {
        setFetchError(error.message || "Failed to load customers.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("customer.relative_just_now");
    if (mins < 60) return t("customer.relative_min_ago").replace("[N]", String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("customer.relative_hour_ago").replace("[N]", String(hrs));
    const days = Math.floor(hrs / 24);
    if (days === 1) return t("customer.relative_yesterday");
    if (days < 7) return t("customer.relative_day_ago").replace("[N]", String(days));
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  const displayCustomers = allCustomers.filter((c) => {
    if (quickFilter === "hasPin") return c.latitude && c.longitude;
    if (quickFilter === "noPin") return !c.latitude || !c.longitude;
    if (quickFilter === "visited") return c.lastVisitedAt || visitsMap[c.id];
    return true;
  });
  const totalPinned = allCustomers.filter((c) => c.latitude && c.longitude).length;
  const totalVisited = Object.keys(visitsMap).length;

  const itemStart = allCustomers.length > 0 ? page * pageSize + 1 : 0;
  const itemEnd = page * pageSize + displayCustomers.length;

  useEffect(() => {
    fetchCustomers(query, page);
  }, [query, page, pageSize, clusterFilter, sortBy]);

  useEffect(() => {
    // Fetch clusters once for the filter dropdown
    fetch("/api/clusters?limit=200&offset=0")
      .then(r => r.json())
      .then(data => setAllClusters(data.clusters || []))
      .catch(() => {});
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const confirmed = await askConfirmation({
      title: `${t("admin.bulk_delete")}?`,
      message: `You are about to permanently delete ${selectedIds.length} customers.`,
      confirmText: t("action.delete"),
      type: "danger"
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        const res = await fetch("/api/admin/customers/bulk-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        if (res.ok) {
          setAllCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
          showToast(`${selectedIds.length} customers deleted.`, "success");
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

  const handleBulkCluster = async (action: "add" | "remove") => {
    if (!assignClusterId) { showToast("Select a cluster first", "error"); return; }
    const label = action === "add" ? "add to" : "remove from";
    const confirmed = await askConfirmation({
      title: `${action === "add" ? "Assign" : "Remove"} Cluster`,
      message: `${action === "Add" ? "Assign" : action.charAt(0).toUpperCase() + action.slice(1)} ${selectedIds.length} customers ${label} this cluster?`,
    });
    if (!confirmed) return;
    setIsAssigning(true);
    try {
      const res = await fetch("/api/admin/customers/bulk-cluster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedIds, clusterId: assignClusterId, action }),
      });
      if (res.ok) {
        showToast(`${selectedIds.length} customers ${label} cluster`, "success");
        setSelectedIds([]);
        setAssignClusterId("");
        fetchCustomers(query, page);
      } else {
        showToast("Failed to update cluster", "error");
      }
    } catch { showToast("Network error", "error"); }
    finally { setIsAssigning(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Customers" />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              {t("customer.db_title")}
            </h1>
            <p className="mt-1 text-sm font-medium text-secondary">
              {t("customer.db_subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setIsManagementMode(!isManagementMode);
                  setSelectedIds([]);
                }}
                className={`!py-2.5 !px-5 rounded-full text-[14px] font-bold transition-all duration-200 active:scale-90 flex items-center justify-center gap-2 ${isManagementMode ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 shadow-sm' : 'btn-secondary'}`}
              >
                {isManagementMode ? "Cancel" : "Manage"}
              </button>
            )}
            <Link
              href="/customers/stats"
              className="btn-outline !py-2.5 !px-5"
            >
              Stats
            </Link>
            <Link
              href="/customers/new"
              className="btn-primary !py-2.5 !px-5"
            >
              <span className="mr-2 text-lg leading-none">+</span> {t("customer.add")}
            </Link>
          </div>
        </div>

        {isManagementMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-4 border border-red-200 dark:border-red-900/50 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-black">{selectedIds.length}</div>
                <span className="font-bold text-red-700 dark:text-red-400 text-[13px]">selected</span>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="btn-danger !py-2 !px-4 text-[13px]"
              >
                {isDeleting ? "..." : t("admin.bulk_delete")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={assignClusterId}
                onChange={(e) => setAssignClusterId(e.target.value)}
                className="flex-1 rounded-2xl border border-red-200 dark:border-red-800 bg-background px-4 py-2.5 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select cluster...</option>
                {allClusters.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleBulkCluster("add")}
                disabled={isAssigning || !assignClusterId}
                className="rounded-full bg-blue-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => handleBulkCluster("remove")}
                disabled={isAssigning || !assignClusterId}
                className="rounded-full bg-orange-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-orange-700 transition-all active:scale-90 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </motion.div>
        )}

        {/* Stat Badges */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex gap-2 mb-4"
        >
          <div className="flex items-center gap-1.5 rounded-full bg-card border border-card-border px-3.5 py-1.5 shadow-sm">
            <span className="text-[13px] font-black text-primary">{allCustomers.length}</span>
            <span className="text-[10px] font-medium text-secondary">total</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 px-3.5 py-1.5 shadow-sm">
            <span className="text-[13px] font-black text-blue-700 dark:text-blue-400">{totalPinned}</span>
            <span className="text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">📍 pinned</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-3.5 py-1.5 shadow-sm">
            <span className="text-[13px] font-black text-emerald-700 dark:text-emerald-400">{totalVisited}</span>
            <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">✅ visited</span>
          </div>
        </motion.div>

        {/* Sort */}
        <div className="w-full mb-3">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
            className="w-full rounded-2xl border border-card-border bg-card/80 backdrop-blur-xl px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer pr-10 shadow-sm"
          >
            <option value="newest">{t("customer.sort_newest")}</option>
            <option value="oldest">{t("customer.sort_oldest")}</option>
            <option value="recent_visit">{t("customer.sort_recent_visit")}</option>
            <option value="oldest_visit">{t("customer.sort_oldest_visit")}</option>
            <option value="most_visited">{t("customer.sort_most_visited")}</option>
            <option value="least_visited">{t("customer.sort_least_visited")}</option>
          </select>
        </div>

        {/* Cluster Filter */}
        <div className="w-full mb-3">
          {allClusters.length > 0 && (
            <div className="relative w-full">
              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value)}
                className="w-full rounded-2xl border border-card-border bg-card/80 backdrop-blur-xl px-4 py-3 text-[13px] font-medium text-primary focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer pr-10 shadow-sm"
              >
                <option value="all">All Clusters</option>
                {allClusters.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                <Icon name="chevron-down" size={16} className="text-secondary" />
              </div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-1">
          {(["all", "hasPin", "noPin", "visited"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setQuickFilter(f); setPage(0); }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-90 ${
                quickFilter === f
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-card/80 backdrop-blur-xl text-secondary border border-card-border hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm"
              }`}
            >
              {f === "all" ? t("customer.filter_all") : f === "hasPin" ? t("customer.filter_has_pin") : f === "noPin" ? t("customer.filter_no_pin") : t("customer.filter_visited")}
            </button>
          ))}
        </div>

        {/* Error State */}
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
                <Icon name="info" size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <p className="text-[13px] font-bold text-red-700 dark:text-red-400">{fetchError}</p>
            </div>
            <button
              onClick={() => fetchCustomers(query, page)}
              className="rounded-xl bg-red-600 px-4 py-2 text-[12px] font-bold text-white active:scale-90 transition-all shrink-0"
            >
              Retry
            </button>
          </motion.div>
        )}

        {allCustomers.length === 0 && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-[2.5rem] bg-card p-12 text-center shadow-sm border border-card-border"
          >
            <div className="mb-5 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl shadow-lg shadow-blue-500/20">
              {query ? '🔍' : '👤'}
            </div>
            <p className="text-xl font-extrabold tracking-tight text-primary">
              {query ? t("search.no_results") : "It's quiet here"}
            </p>
            <p className="mt-2 text-[14px] font-medium text-secondary max-w-xs mx-auto">
              {query ? `We couldn't find anyone matching "${query}".` : "You haven't added any customers yet. Start building your database."}
            </p>
            {!query && (
              <Link
                href="/customers/new"
                className="btn-primary mt-8 inline-flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Add your first customer
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-sm border border-card-border min-h-[500px]">
            {isLoading && !fetchError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[2rem]">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-[12px] font-bold text-secondary animate-pulse">Loading...</p>
                </div>
              </div>
            )}
            {displayCustomers.length > 0 && (
            <ul className="divide-y divide-card-border min-h-[500px] overflow-y-auto">
              {displayCustomers.map((customer, i) => {
                const gradientIndex = customer.name.charCodeAt(0) % avatarGradients.length;
                return (
                <motion.li
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, delay: Math.min(i, 10) * 0.025 }}
                  onClick={() => isManagementMode && toggleSelection(customer.id)}
                  className={`group relative flex items-center justify-between p-4 transition-all sm:p-5 ${
                    isManagementMode && selectedIds.includes(customer.id) 
                      ? "bg-blue-50/50 dark:bg-blue-900/20" 
                      : "hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                  } ${isManagementMode ? "cursor-pointer" : "cursor-default active:scale-[0.99]"}`}
                >
                  {!isManagementMode && (
                    <Link
                      href={`/customers/${customer.id}`}
                      className="absolute inset-0 z-0 rounded-[2rem] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-500/20"
                      aria-label={`View details for ${customer.name}`}
                    />
                  )}

                  <div className="z-10 flex min-w-0 flex-1 items-center gap-4 pointer-events-none">
                    {isManagementMode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mr-2"
                      >
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${selectedIds.includes(customer.id) ? "bg-blue-600 text-white scale-110 shadow-sm" : "border-2 border-card-border bg-transparent"
                          }`}>
                          {selectedIds.includes(customer.id) && (
                            <Icon name="check" size={16} strokeWidth={3} />
                          )}
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="relative h-14 w-14 shrink-0">
                      <div className={`absolute inset-0 flex items-center justify-center rounded-[1rem] bg-gradient-to-br ${avatarGradients[gradientIndex]} text-lg font-bold text-white shadow-sm`}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white shadow-sm border-2 border-card leading-none">
                        {page * pageSize + i + 1}
                      </div>
                      {customer.housePictureUrl && (
                        <img
                          src={customer.housePictureUrl}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="relative h-14 w-14 rounded-[1rem] object-cover border-2 border-card opacity-0 transition-opacity duration-300"
                          onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-extrabold tracking-tight text-primary">
                        {customer.name}
                      </h2>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Icon name="whatsapp" size={14} className="text-[#25D366]" />
                        <span className="truncate text-[13px] font-medium text-secondary">
                          {customer.phoneNumber ? customer.phoneNumber : "No phone number"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-secondary/70">
                        {customer.address}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-[9px] font-medium text-secondary/60">
                          <Icon name="calendar" size={12} />
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : "-"}
                        </span>
                        {(customer.lastVisitedAt || visitsMap[customer.id]) && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                            <Icon name="check" size={10} strokeWidth={2.5} /> {timeAgo(customer.lastVisitedAt || visitsMap[customer.id])}
                          </span>
                        )}
                        {customer.visitCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                            {t("customer.visit_count").replace("[N]", String(customer.visitCount))}
                          </span>
                        )}
                        {customer.visitCount >= 1 && customer.visitCount < 4 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                            {t("customer.tier_new")}
                          </span>
                        )}
                        {customer.visitCount >= 4 && customer.visitCount < 10 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight">
                            {t("customer.tier_regular")}
                          </span>
                        )}
                        {customer.visitCount >= 10 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                            {t("customer.tier_frequent")}
                          </span>
                        )}
                        {customer.clusters?.map((cc: any) => (
                          <span key={cc.cluster.id} className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[9px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-tight">
                            {cc.cluster.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!isManagementMode && (
                    <div className="relative z-10 ml-3 flex shrink-0 items-center gap-1.5">
                      {customer.phoneNumber && (
                        <a
                          href={`https://wa.me/${customer.phoneNumber.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-all hover:bg-[#20bd5a] hover:shadow-md hover:scale-105 active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-1"
                          title={t("customer.call")}
                        >
                          <Icon name="whatsapp" size={16} />
                        </a>
                      )}

                      {customer.latitude && customer.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${customer.latitude},${customer.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm transition-all hover:bg-blue-200 dark:hover:bg-blue-800/60 hover:shadow-md hover:scale-105 active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          title={t("customer.pin")}
                        >
                          <span className="text-base">📍</span>
                        </a>
                      )}
                    </div>
                  )}
                </motion.li>
                );
              })}
            </ul>
            )}

            {!query && (
              <div className="flex items-center justify-between gap-3 border-t border-card-border px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-xl text-primary shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover"
                  >
                    <Icon name="chevron-left" size={16} />
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-[12px] font-medium text-secondary">Page</span>
                    <input
                      type="number"
                      min={1}
                      value={jumpInput}
                      onChange={e => setJumpInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const p = parseInt(e.currentTarget.value);
                          if (!isNaN(p) && p >= 1) { setPage(p - 1); setJumpInput(""); }
                        }
                      }}
                      onBlur={() => setJumpInput("")}
                      className="w-10 text-center text-[14px] font-bold text-primary bg-transparent border border-transparent focus:border-blue-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
                      placeholder={String(page + 1)}
                    />
                  </div>

                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-xl text-primary shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover"
                  >
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(0); setJumpInput(""); }}
                    className="rounded-xl bg-card/80 backdrop-blur-xl px-2.5 py-1.5 text-[12px] font-bold text-primary border border-card-border outline-none cursor-pointer active:scale-90 transition-all shadow-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                  </select>
                  {allCustomers.length > 0 && (
                    <span className="text-[11px] font-medium text-secondary/60">
                      {itemStart}–{itemEnd}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomersListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center rounded-[2rem] bg-card border border-card-border shadow-sm px-8 py-12">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-surface-hover text-3xl mb-4 border border-card-border">
            ⏳
          </div>
          <p className="text-[14px] font-bold text-secondary animate-pulse">Loading...</p>
        </div>
      </div>
    }>
      <CustomersListContent />
    </Suspense>
  );
}
