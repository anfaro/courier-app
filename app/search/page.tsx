// app/search/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import SearchResultCard from "@/components/SearchResultCard";
import SearchResultClusterCard from "@/components/SearchResultClusterCard";
import SearchResultStaffCard from "@/components/SearchResultStaffCard";
import Icon from "@/components/Icon";
import { useLanguage } from "@/components/LanguageProvider";

type FilterType = "all" | "customer" | "cluster" | "staff";
type TabDef = { key: FilterType; label: string };

const TABS: TabDef[] = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customers" },
  { key: "cluster", label: "Clusters" },
  { key: "staff", label: "Staff" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<FilterType>("all");
  const [results, setResults] = useState<{
    customers: any[];
    clusters: any[];
    users: any[];
  }>({ customers: [], clusters: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery, router]);

  const fetchResults = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ customers: [], clusters: [], users: [] });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: debouncedQuery });
      if (activeTab !== "all") params.set("type", activeTab);

      const res = await fetch(`/api/search/global?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults({
          customers: data.customers || [],
          clusters: data.clusters || [],
          users: data.users || [],
        });
      }
    } catch {
      setResults({ customers: [], clusters: [], users: [] });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, activeTab]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const totalCount = results.customers.length + results.clusters.length + results.users.length;

  const showTab = (key: FilterType): boolean => {
    if (key === "staff") return results.users.length > 0;
    return true;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background border-b border-card-border">
        <PageHeader title="Search" />
        <div className="px-4 sm:px-6 pb-3 pt-1">
          <div className="relative max-w-2xl mx-auto">
            <Icon name="search" size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full rounded-full border-2 border-card-border bg-card py-3.5 pl-11 pr-11 text-[16px] font-bold text-primary outline-none focus:border-blue-500 transition-all placeholder:text-secondary/40"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults({ customers: [], clusters: [], users: [] }); setHasSearched(false); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary active:scale-90"
              >
                <Icon name="close" size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4">
          {/* Stats */}
          {hasSearched && !isLoading && totalCount > 0 && (
            <div className="flex items-center gap-2 mb-4 text-[12px] font-mono text-secondary">
              <span className="font-bold text-primary">{totalCount}</span> results
              {results.customers.length > 0 && <span>· {results.customers.length} customers</span>}
              {results.clusters.length > 0 && <span>· {results.clusters.length} clusters</span>}
              {results.users.length > 0 && <span>· {results.users.length} staff</span>}
            </div>
          )}

          {/* Tabs */}
          {hasSearched && totalCount > 0 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
              {TABS.filter((t) => showTab(t.key)).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all active:scale-90 whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-surface-hover text-secondary hover:text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24"
              >
                <div className="h-10 w-10 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin mb-4" />
                <p className="text-[14px] font-bold text-secondary">{t("action.loading")}</p>
              </motion.div>
            ) : !hasSearched ? (
              <motion.div
                key="empty-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
                  <Icon name="search" size={28} strokeWidth={2} className="text-secondary/50" />
                </div>
                <p className="text-[16px] font-bold text-primary mb-1">Search your data</p>
                <p className="text-[13px] text-secondary max-w-xs">
                  Find customers by name, address, or phone number. Search clusters and staff too.
                </p>
              </motion.div>
            ) : totalCount === 0 ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-surface-hover flex items-center justify-center mb-4 text-[24px]">
                  🔍
                </div>
                <p className="text-[16px] font-bold text-primary mb-1">No matches found</p>
                <p className="text-[13px] text-secondary max-w-xs">
                  Try a different search term or check your spelling.
                </p>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 pb-8">
                {activeTab === "customer" && (
                  <>
                    {results.customers.map((c: any, i: number) => (
                      <SearchResultCard key={c.id} customer={c} index={i} />
                    ))}
                    {results.customers.length === 0 && (
                      <p className="text-center text-[13px] text-secondary py-8">No customer matches</p>
                    )}
                  </>
                )}

                {activeTab === "cluster" && (
                  <>
                    {results.clusters.map((c: any, i: number) => (
                      <SearchResultClusterCard key={c.id} cluster={c} index={i} />
                    ))}
                    {results.clusters.length === 0 && (
                      <p className="text-center text-[13px] text-secondary py-8">No cluster matches</p>
                    )}
                  </>
                )}

                {activeTab === "staff" && (
                  <>
                    {results.users.map((u: any, i: number) => (
                      <SearchResultStaffCard key={u.id} user={u} index={i} />
                    ))}
                    {results.users.length === 0 && (
                      <p className="text-center text-[13px] text-secondary py-8">No staff matches</p>
                    )}
                  </>
                )}

                {activeTab === "all" && (
                  <>
                    {results.customers.length > 0 && (
                      <div>
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-blue-500" />
                          Customers ({results.customers.length})
                        </h3>
                        <div className="space-y-3">
                          {results.customers.map((c: any, i: number) => (
                            <SearchResultCard key={c.id} customer={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}

                    {results.clusters.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-orange-500" />
                          Clusters ({results.clusters.length})
                        </h3>
                        <div className="space-y-3">
                          {results.clusters.map((c: any, i: number) => (
                            <SearchResultClusterCard key={c.id} cluster={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}

                    {results.users.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-purple-500" />
                          Staff ({results.users.length})
                        </h3>
                        <div className="space-y-3">
                          {results.users.map((u: any, i: number) => (
                            <SearchResultStaffCard key={u.id} user={u} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[100dvh] bg-background overflow-hidden items-center justify-center">
        <div className="h-10 w-10 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
