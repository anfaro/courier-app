"use client";

import { useEffect, useState, Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";

function ClustersListContent() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();

  const [allClusters, setAllClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Management State
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = (session?.user as any)?.role === "superadmin";

  useEffect(() => {
    const fetchClusters = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/clusters");
        const data = await res.json();
        setAllClusters(data.clusters || data || []);
      } catch (error) {
        console.error("Failed to fetch clusters:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClusters();
  }, []);

  const toggleSelection = (id: number) => {
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

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Clusters</h1>
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
            <Link
              href="/clusters/new"
              className="btn-primary !py-2.5 !px-5"
            >
              <span className="mr-2 text-lg leading-none">+</span> Add
            </Link>
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 font-bold text-secondary">{t("action.loading")}</p>
          </div>
        ) : allClusters.length === 0 ? (
          <div className="rounded-[2.5rem] bg-card p-10 text-center shadow-sm border border-card-border">
            <p className="text-secondary font-medium">No clusters created yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] bg-card shadow-sm border border-card-border">
            <ul className="divide-y divide-card-border">
              {allClusters.map((cluster) => (
                <li 
                  key={cluster.id} 
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
                      <div className="mr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cluster.id)}
                          readOnly
                          className="h-5 w-5 rounded-lg border-card-border text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-purple-100 dark:bg-purple-900/30 text-xl text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200 dark:border-purple-800">📦</div>
                    <div>
                      <h2 className="text-[17px] font-bold tracking-tight text-primary">{cluster.name}</h2>
                      <p className="text-sm font-medium text-secondary">{cluster.customerCount} Customers</p>
                    </div>
                  </div>

                  {!isManagementMode && (
                    <div className="relative z-10 text-secondary group-hover:text-purple-600 transition">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClustersListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <ClustersListContent />
    </Suspense>
  );
}
