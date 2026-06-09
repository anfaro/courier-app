"use client";

import { useEffect, useState, Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { motion } from "framer-motion";

const clustersCache = new Map<string, { data: any[]; hasMore: boolean; ts: number }>();
const CL_CACHE_TTL = 60000;

function ClustersListContent() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();

  const [allClusters, setAllClusters] = useState<any[]>([]);
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
  const [editingCluster, setEditingCluster] = useState<any | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isSuperAdmin = (session?.user as any)?.role === "superadmin";

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("customer.relative_just_now");
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return t("customer.relative_yesterday");
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  const totalCustomers = allClusters.reduce((sum: number, c: any) => sum + (c.customerCount || 0), 0);

  const fetchClusters = async (p: number) => {
    const cacheKey = `clusters:${p}:${pageSize}`;
    const cached = clustersCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CL_CACHE_TTL) {
      setAllClusters(cached.data);
      setHasMore(cached.hasMore);
      setIsLoading(false);
      setFetchError("");
      return;
    }

    setIsLoading(true);
    setFetchError("");
    try {
      const res = await fetchWithTimeout(`/api/clusters?limit=${pageSize}&offset=${p * pageSize}`, {}, 60000);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      const list = data.clusters || data || [];
      const more = data.hasMore ?? false;
      clustersCache.set(cacheKey, { data: list, hasMore: more, ts: Date.now() });
      setAllClusters(list);
      setHasMore(more);
    } catch (error: any) {
      if (error.name === "AbortError") {
        setFetchError("Request timed out. Check your connection.");
      } else {
        setFetchError(error.message || "Failed to load clusters.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters(page);
  }, [page, pageSize]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const confirmed = await askConfirmation({
      title: `${t("admin.bulk_delete")}?`,
      message: `You are about to permanently delete ${selectedIds.length} clusters.`,
      confirmText: t("action.delete"),
      type: "danger"
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        const res = await fetch("/api/admin/clusters/bulk-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        if (res.ok) {
          setAllClusters(prev => prev.filter(c => !selectedIds.includes(c.id)));
          showToast(`${selectedIds.length} clusters deleted.`, "success");
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

  async function handleEditSave() {
    if (!editingCluster || !editingName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/clusters/${editingCluster.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), notes: editingNotes || null }),
      });
      if (res.ok) {
        showToast("Cluster updated", "success");
        setEditingCluster(null);
        fetchClusters(page);
      } else {
        showToast("Failed to update", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <PageHeader title="Clusters" />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">{t("cluster.title")}</h1>
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
              href="/clusters/new"
              className="btn-primary !py-2.5 !px-5"
            >
              <span className="mr-2 text-lg leading-none">+</span> {t("cluster.add")}
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        {allClusters.length > 0 && (
          <div className="flex gap-3 mb-5">
            <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">{t("cluster.total_clusters")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{allClusters.length}</p>
            </div>
            <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">{t("cluster.total_customers")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{totalCustomers}</p>
            </div>
            <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">{t("cluster.avg_customers")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{allClusters.length > 0 ? Math.round(totalCustomers / allClusters.length) : 0}</p>
            </div>
          </div>
        )}

        {fetchError && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/50">
            <p className="text-[13px] font-bold text-red-700 dark:text-red-400">{fetchError}</p>
            <button
              onClick={() => fetchClusters(page)}
              className="rounded-xl bg-red-600 px-4 py-2 text-[12px] font-bold text-white active:scale-90 transition-all shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {isManagementMode && selectedIds.length > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-[24px] bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/50">
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

        {allClusters.length === 0 && !isLoading ? (
          <div className="rounded-[2.5rem] bg-card p-10 text-center shadow-sm border border-card-border">
            <p className="text-secondary font-medium">{t("cluster.empty")}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-sm border border-card-border">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[2rem]">
                <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-surface-hover text-2xl border border-card-border">
                  ⏳
                </div>
              </div>
            )}
            {allClusters.length === 0 && (
              <div className="min-h-[400px]" />
            )}
            {allClusters.length > 0 && (
            <ul className="divide-y divide-card-border">
              {allClusters.map((cluster, i) => (
                <motion.li
                  key={cluster.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.035 }}
                  onClick={() => isManagementMode && toggleSelection(cluster.id)}
                  className={`group relative flex items-center justify-between p-5 transition-colors ${
                    isManagementMode && selectedIds.includes(cluster.id)
                      ? "bg-blue-50/50 dark:bg-blue-900/20"
                      : "hover:bg-purple-50/50 active:bg-purple-100 dark:hover:bg-purple-900/10"
                  } ${isManagementMode ? "cursor-pointer" : ""}`}
                >
                  {!isManagementMode && (
                    <Link href={`/clusters/${cluster.id}`} className="absolute inset-0 z-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-purple-500/20 rounded-[2rem]" />
                  )}

                  <div className="z-10 flex items-center gap-4 pointer-events-none transition-transform duration-200 group-active:scale-[0.98]">
                    {isManagementMode && (
                      <div className="mr-3">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${selectedIds.includes(cluster.id) ? "bg-blue-600 text-white scale-110" : "border-2 border-card-border bg-transparent"
                          }`}>
                          {selectedIds.includes(cluster.id) && (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-purple-100 dark:bg-purple-900/30 text-xl text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200 dark:border-purple-800">📦</div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[17px] font-bold tracking-tight text-primary truncate">{cluster.name}</h2>
                      <p className="text-sm font-medium text-secondary">
                        <Link
                          href={`/customers?clusterId=${cluster.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 dark:text-blue-400 hover:underline pointer-events-auto"
                        >
                          {t("cluster.customers").replace("[N]", String(cluster.customerCount || 0))}
                        </Link>
                      </p>
                      {cluster.lastActivity ? (
                        <p className="text-[11px] text-secondary/60 mt-0.5">
                          {t("cluster.last_activity").replace("[DATE]", timeAgo(cluster.lastActivity) || "")}
                        </p>
                      ) : cluster.createdAt ? (
                        <p className="text-[11px] text-secondary/60 mt-0.5">
                          {t("cluster.no_activity")}
                        </p>
                      ) : null}
                      {cluster.notes && (
                        <p className="text-[12px] text-secondary/60 truncate mt-1">{cluster.notes}</p>
                      )}
                    </div>
                  </div>

                  {!isManagementMode && (
                    <div className="relative z-10 flex items-center gap-1 pointer-events-auto">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCluster(cluster);
                          setEditingName(cluster.name || "");
                          setEditingNotes(cluster.notes || "");
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-hover text-secondary border border-card-border active:scale-90 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </motion.button>
                      <div className="text-secondary group-hover:text-purple-600 transition pointer-events-auto">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>
            )}

            <div className="flex items-center justify-center gap-2 border-t border-card-border px-4 py-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-primary font-bold transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
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
                  className="w-14 text-center text-[14px] font-bold text-secondary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
                  placeholder={String(page + 1)}
                />
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore || isLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-primary font-bold transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); setJumpInput(""); }}
                className="ml-2 rounded-xl bg-surface-hover px-2.5 py-1.5 text-[12px] font-bold text-primary border border-card-border outline-none cursor-pointer active:scale-90 transition-all"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingCluster && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingCluster(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-card p-6 shadow-2xl border border-card-border"
            >
              <h3 className="text-[17px] font-extrabold text-primary mb-5">{t("cluster.edit")}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1.5 block">{t("cluster.name")}</label>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-purple-500 transition-all"
                    placeholder={t("cluster.name")}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1.5 block">{t("cluster.notes_placeholder")}</label>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-purple-500 transition-all resize-none"
                    placeholder={t("cluster.notes_placeholder")}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingCluster(null)}
                  className="btn-secondary flex-1"
                >
                  {t("action.cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleEditSave}
                  disabled={savingEdit || !editingName.trim()}
                  className="btn-primary flex-1"
                >
                  {savingEdit ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    t("action.save")
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClustersListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center rounded-[2.5rem] bg-card border border-card-border shadow-sm px-8 py-12">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-surface-hover text-3xl mb-4 border border-card-border">
            ⏳
          </div>
          <p className="text-[14px] font-bold text-secondary animate-pulse">Loading...</p>
        </div>
      </div>
    }>
      <ClustersListContent />
    </Suspense>
  );
}
