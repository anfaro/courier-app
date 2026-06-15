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
import Icon from "@/components/Icon";

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
  const [pageSize, setPageSize] = useState(10);
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

  const totalCustomers = allClusters.reduce((sum: number, c: any) => sum + (c.customerCount || 0), 0);
  const itemStart = allClusters.length > 0 ? page * pageSize + 1 : 0;
  const itemEnd = page * pageSize + allClusters.length;

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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-l-[20px]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">📦 {t("cluster.total_clusters")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{allClusters.length}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
              className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-l-[20px]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">👥 {t("cluster.total_customers")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{totalCustomers}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
              className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-[20px]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">📊 {t("cluster.avg_customers")}</p>
              <p className="text-[22px] font-black text-primary leading-none">{allClusters.length > 0 ? Math.round(totalCustomers / allClusters.length) : 0}</p>
            </motion.div>
          </div>
        )}

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
              onClick={() => fetchClusters(page)}
              className="rounded-xl bg-red-600 px-4 py-2 text-[12px] font-bold text-white active:scale-90 transition-all shrink-0"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Management Bar */}
        {isManagementMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-4 border border-red-200 dark:border-red-900/50 shadow-sm"
          >
            <div className="flex items-center justify-between">
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
          </motion.div>
        )}

        {allClusters.length === 0 && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-[2.5rem] bg-card p-12 text-center shadow-sm border border-card-border"
          >
            <div className="mb-5 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-4xl shadow-lg shadow-purple-500/20">
              📦
            </div>
            <p className="text-xl font-extrabold tracking-tight text-primary">{t("cluster.empty")}</p>
            <p className="mt-2 text-[14px] font-medium text-secondary max-w-xs mx-auto">
              Group your customers into regions, routes, or areas for better organization.
            </p>
            <Link
              href="/clusters/new"
              className="btn-primary mt-8 inline-flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> {t("cluster.add")}
            </Link>
          </motion.div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-sm border border-card-border">
            {isLoading && !fetchError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-[2rem]">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-[12px] font-bold text-secondary animate-pulse">Loading...</p>
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
                  className={`group relative flex items-center justify-between p-5 transition-all ${
                    isManagementMode && selectedIds.includes(cluster.id)
                      ? "bg-blue-50/50 dark:bg-blue-900/20"
                      : "hover:bg-purple-50/40 dark:hover:bg-purple-900/10 cursor-default"
                  } ${isManagementMode ? "cursor-pointer" : ""}`}
                >
                  {!isManagementMode && (
                    <Link href={`/clusters/${cluster.id}`} className="absolute inset-0 z-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-purple-500/20 rounded-[2rem]" />
                  )}

                  <div className="z-10 flex items-center gap-4 pointer-events-none transition-transform duration-200 group-active:scale-[0.98]">
                    {isManagementMode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mr-3"
                      >
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${selectedIds.includes(cluster.id) ? "bg-blue-600 text-white scale-110 shadow-sm" : "border-2 border-card-border bg-transparent"
                          }`}>
                          {selectedIds.includes(cluster.id) && (
                            <Icon name="check" size={16} strokeWidth={3} />
                          )}
                        </div>
                      </motion.div>
                    )}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-purple-500 to-indigo-600 text-xl text-white shadow-sm">
                      📦
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[17px] font-extrabold tracking-tight text-primary truncate">{cluster.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <Link
                          href={`/customers?clusterId=${cluster.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors pointer-events-auto"
                        >
                          👥 {cluster.customerCount || 0}
                        </Link>
                        {cluster.lastActivity ? (
                          <span className="text-[11px] text-secondary/60">
                            {t("cluster.last_activity").replace("[DATE]", timeAgo(cluster.lastActivity) || "")}
                          </span>
                        ) : cluster.createdAt ? (
                          <span className="text-[11px] text-secondary/60">
                            {t("cluster.no_activity")}
                          </span>
                        ) : null}
                      </div>
                      {cluster.notes && (
                        <p className="text-[12px] text-secondary/50 truncate mt-1">{cluster.notes}</p>
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
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-xl text-secondary shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90"
                      >
                        <Icon name="edit" size={14} />
                      </motion.button>
                      <div className="text-secondary/40 group-hover:text-purple-500 transition-colors">
                        <Icon name="chevron-right" size={20} />
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>
            )}

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
                    className="w-10 text-center text-[14px] font-bold text-primary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none"
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
                {allClusters.length > 0 && (
                  <span className="text-[11px] font-medium text-secondary/60">
                    {itemStart}–{itemEnd}
                  </span>
                )}
              </div>
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
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-card p-6 shadow-2xl border border-card-border"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                  📦
                </div>
                <h3 className="text-[17px] font-extrabold text-primary">{t("cluster.edit")}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1.5 block">{t("cluster.name")}</label>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                    placeholder={t("cluster.name")}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1.5 block">{t("cluster.notes_placeholder")}</label>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
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
