// components/LogViewer.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";

type LogType = "activity" | "errors" | "access";

interface LogStats {
  today: number;
  week: number;
  total: number;
}

export default function LogViewer() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<LogType>("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  useScrollLock(selectedLog !== null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveTail, setLiveTail] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestCreatedAtRef = useRef<string | null>(null);

  const [stats, setStats] = useState<Record<string, LogStats>>({});

  const [showPruneModal, setShowPruneModal] = useState(false);
  useScrollLock(showPruneModal);
  const [pruneType, setPruneType] = useState<string>("all");
  const [pruneDays, setPruneDays] = useState(90);
  const [pruning, setPruning] = useState(false);

  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({
        type: activeTab,
        q: debouncedQuery,
        from: dateFrom,
        to: dateTo,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetchWithTimeout(`/api/admin/system/logs?${params}`, {}, 30000);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();

      if (liveTail && isPolling && latestCreatedAtRef.current) {
        const newLogs = (data.logs || []).filter(
          (l: any) => new Date(l.createdAt) > new Date(latestCreatedAtRef.current!)
        );
        if (newLogs.length > 0) {
          setLogs(prev => [...newLogs, ...prev]);
          latestCreatedAtRef.current = newLogs[0].createdAt;
        }
      } else {
        setLogs(data.logs || []);
        if ((data.logs || []).length > 0) {
          latestCreatedAtRef.current = data.logs[0].createdAt;
        }
      }
      setHasMore(data.hasMore !== undefined ? data.hasMore : false);
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (!isPolling) setFetchError("Request timed out.");
      } else {
        if (!isPolling) setFetchError(err.message || "Failed to load.");
      }
      if (!isPolling) setLogs([]);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [activeTab, debouncedQuery, dateFrom, dateTo, page, liveTail]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system/logs/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs(true);
        fetchStats();
      }, 10000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs, fetchStats]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedQuery, dateFrom, dateTo]);

  const exportLogs = async (format: "json" | "csv") => {
    try {
      const params = new URLSearchParams({
        type: activeTab,
        q: debouncedQuery,
        from: dateFrom,
        to: dateTo,
        page: "0",
        pageSize: "10000",
      });
      const res = await fetchWithTimeout(`/api/admin/system/logs?${params}`, {}, 60000);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const entries = data.logs || [];

      if (format === "json") {
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
        downloadBlob(blob, `logs-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`);
      } else {
        const headers = Object.keys(entries[0] || {}).join(",");
        const rows = entries.map((e: any) =>
          Object.values(e).map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv" });
        downloadBlob(blob, `logs-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
      }
      setShowExportDropdown(false);
    } catch (err: any) {
      setFetchError(err.message || "Export failed");
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrune = async () => {
    setPruning(true);
    try {
      const res = await fetch("/api/admin/system/logs/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: pruneType, olderThanDays: pruneDays }),
      });
      if (res.ok) {
        setShowPruneModal(false);
        fetchLogs();
        fetchStats();
      }
    } catch {}
    setPruning(false);
  };

  const statBadge = (type: LogType) => {
    const s = stats[type];
    if (!s) return null;
    return (
      <span className="text-[10px] font-mono font-black text-secondary ml-1.5 shrink-0">
        {s.today}
      </span>
    );
  };

  const tabs: LogType[] = ["activity", "errors", "access"];

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(tabs as LogType[]).map((type) => {
          const s = stats[type];
          const isActive = activeTab === type;
          const colors = type === "errors"
            ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50"
            : type === "access"
            ? "bg-card border-card-border"
            : "bg-card border-card-border";
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`rounded-2xl border p-3 text-center transition-all active:scale-90 ${
                isActive ? "ring-2 ring-blue-500 dark:ring-blue-400 shadow-sm " + colors : colors + " opacity-70 hover:opacity-100"
              }`}
            >
              <p className="text-lg font-black text-primary">{s ? s.total : "…"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mt-0.5">{type}</p>
              {s && (
                <p className="text-[9px] font-mono text-secondary mt-0.5">
                  {s.today} today · {s.week} week
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Icon name="search" size={14} strokeWidth={2.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search logs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-card-border bg-card px-9 py-2.5 text-[13px] font-medium text-primary outline-none focus:border-blue-500 transition-all placeholder:text-secondary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary active:scale-90"
            >
              <Icon name="close" size={14} strokeWidth={3} />
            </button>
          )}
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-full border border-card-border bg-card px-3.5 py-2.5 text-[12px] font-medium text-primary outline-none focus:border-blue-500 transition-all"
        />
        <span className="text-[11px] font-bold text-secondary">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-full border border-card-border bg-card px-3.5 py-2.5 text-[12px] font-medium text-primary outline-none focus:border-blue-500 transition-all"
        />

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { setAutoRefresh(!autoRefresh); if (liveTail) setLiveTail(false); }}
            className={`px-3 py-2.5 rounded-full text-[11px] font-bold transition-all active:scale-90 flex items-center gap-1.5 ${
              autoRefresh ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30" : "bg-surface-hover text-secondary hover:text-primary"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`} />
            Auto
          </button>
          <button
            onClick={() => { setLiveTail(!liveTail); if (!autoRefresh) setAutoRefresh(true); }}
            className={`px-3 py-2.5 rounded-full text-[11px] font-bold transition-all active:scale-90 flex items-center gap-1.5 ${
              liveTail ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30" : "bg-surface-hover text-secondary hover:text-primary"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveTail ? "bg-blue-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`} />
            Live
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3 py-2.5 rounded-full bg-surface-hover text-secondary hover:text-primary text-[11px] font-bold transition-all active:scale-90 flex items-center gap-1.5"
            >
              <Icon name="download" size={14} strokeWidth={2.5} />
              Export
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-2xl bg-card border border-card-border shadow-xl overflow-hidden">
                <button onClick={() => exportLogs("json")} className="w-full px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-surface-hover text-left flex items-center gap-2 active:scale-90">
                  Export as JSON
                </button>
                <button onClick={() => exportLogs("csv")} className="w-full px-4 py-2.5 text-[12px] font-bold text-primary hover:bg-surface-hover text-left flex items-center gap-2 active:scale-90">
                  Export as CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowPruneModal(true)}
            className="px-3 py-2.5 rounded-full bg-surface-hover text-secondary hover:text-red-600 text-[11px] font-bold transition-all active:scale-90 flex items-center gap-1.5"
          >
            <Icon name="trash" size={14} strokeWidth={2.5} />
            Prune
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className={`rounded-[32px] border border-card-border shadow-sm overflow-hidden transition-all ${activeTab === 'access' ? 'bg-[#0f172a] border-slate-700' : 'bg-card'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${activeTab === 'access' ? 'border-slate-800 bg-slate-900/50' : 'border-card-border'}`}>
          <div className="flex items-center gap-3">
            {activeTab === 'access' && (
              <div className="flex gap-1.5 mr-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              </div>
            )}
            <h3 className={`font-black uppercase tracking-wider text-[12px] ${activeTab === 'access' ? 'text-slate-400 font-mono' : 'text-primary'}`}>
              {activeTab === 'activity' ? "Activity Log" :
               activeTab === 'errors' ? "Error Log" : "Access Log"}
            </h3>
            {(autoRefresh || liveTail) && (
              <span className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase">● Live</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <span className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
            <span className="text-[11px] font-mono text-secondary">{logs.length} entries</span>
          </div>
        </div>

        <div className={`${activeTab === 'access' ? 'divide-y divide-slate-800/50 p-2 font-mono' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${page}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className={activeTab !== 'access' ? "relative" : ""}
            >
              {isLoading && logs.length === 0 ? (
                <div className="p-16 text-center text-secondary font-bold">
                  <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full bg-surface-hover text-xl border border-card-border mx-auto mb-3">
                    ⏳
                  </div>
                  {t("action.loading")}
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  {fetchError ? (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-[14px] font-bold text-red-600">{fetchError}</p>
                      <button onClick={() => fetchLogs()} className="rounded-xl bg-blue-600 px-5 py-2 text-[12px] font-bold text-white active:scale-90">
                        Retry
                      </button>
                    </div>
                  ) : (
                    <p className="text-secondary font-medium">{t("search.no_results")}</p>
                  )}
                </div>
              ) : (
                <>
                  {activeTab !== 'access' && (
                    <div className="absolute left-[26px] top-0 bottom-0 w-[1.5px] bg-card-border" />
                  )}
                  <div className={activeTab !== 'access' ? "" : ""}>
                    {logs.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        onClick={() => setSelectedLog(log)}
                        className={activeTab === 'access'
                          ? "px-3 py-1.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
                          : "relative pl-14 pr-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer"
                        }
                      >
                        {activeTab === 'access' ? (
                          <div className="flex items-center gap-2 py-1 w-full text-[11px] font-mono">
                            <span className="text-slate-500 w-[80px] shrink-0">[{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })}]</span>
                            <span className="text-slate-400 w-[110px] shrink-0 truncate">{log.ipAddress || "N/A"}</span>
                            <span className={`font-black w-[44px] shrink-0 ${
                              log.method === 'GET' ? 'text-emerald-400' :
                              log.method === 'POST' ? 'text-blue-400' :
                              log.method === 'PUT' ? 'text-amber-400' :
                              log.method === 'DELETE' ? 'text-red-400' : 'text-slate-400'
                            }`}>{log.method}</span>
                            <span className="text-slate-100 font-bold flex-1 min-w-0 truncate">{log.pathname}</span>
                            <span className="text-blue-400/80 w-[90px] shrink-0 text-right truncate">@{log.userName || "Guest"}</span>
                          </div>
                        ) : (
                          <>
                            <div className={`absolute left-[20px] top-[18px] h-2.5 w-2.5 rounded-full border-2 border-card ring-4 ${
                              activeTab === 'errors' ? "bg-red-500 ring-red-500/10" :
                              log.action?.includes("DELETE") ? "bg-red-500 ring-red-500/10" : 
                              log.action?.includes("CREATE") ? "bg-emerald-500 ring-emerald-500/10" : "bg-blue-500 ring-blue-500/10"
                            }`} />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-black text-primary truncate">
                                {log.userName || log.ipAddress || "System"}
                                <span className="font-medium text-secondary mx-1.5">•</span>
                                {activeTab === 'activity' && <span className="text-blue-600 dark:text-blue-400">{log.action}</span>}
                                {activeTab === 'errors' && <span className="text-red-600">{log.errorName}</span>}
                              </p>
                              <p className="text-[10px] font-medium text-secondary whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                              </p>
                            </div>
                            {activeTab === 'activity' && log.details && (
                              <p className="text-[11px] font-medium text-secondary/70 mt-0.5 italic truncate">{log.details}</p>
                            )}
                            {activeTab === 'errors' && (
                              <p className="text-[11px] font-medium text-red-600/80 mt-0.5 line-clamp-2">{log.errorMessage}</p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {!isLoading && logs.length > 0 && (
          <div className={`flex items-center justify-between px-5 py-3 border-t ${activeTab === 'access' ? 'border-slate-800' : 'border-card-border'}`}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-full bg-surface-hover text-[12px] font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              ← Previous
            </button>
            <span className="text-[11px] font-mono text-secondary">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 rounded-full bg-surface-hover text-[12px] font-bold text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Stats refresh indicator */}
      {Object.keys(stats).length > 0 && (
        <p className="text-[10px] font-mono text-secondary text-center mt-3 opacity-50">
          Stats updated {autoRefresh ? "live" : "on load"}
        </p>
      )}

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-lg rounded-[32px] bg-card p-6 shadow-2xl border border-card-border max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {activeTab === "errors" && <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-[11px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider">Error</span>}
                  {activeTab === "activity" && <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Activity</span>}
                  {activeTab === "access" && <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Access</span>}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-90"
                >
                  <Icon name="close" size={16} strokeWidth={3} className="text-secondary" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Timestamp</p>
                  <p className="text-[14px] font-bold text-primary">{new Date(selectedLog.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Jakarta" })}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Log ID</p>
                  <p className="text-[13px] font-mono font-bold text-primary">{selectedLog.id}</p>
                </div>

                {activeTab === "activity" && (
                  <>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">User</p>
                      <p className="text-[14px] font-bold text-primary">{selectedLog.userName || "System"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Action</p>
                      <p className="text-[14px] font-bold text-blue-600 dark:text-blue-400">{selectedLog.action}</p>
                    </div>
                    {selectedLog.details && (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Details</p>
                        <p className="text-[14px] font-medium text-primary whitespace-pre-wrap bg-surface-hover rounded-2xl p-4">{selectedLog.details}</p>
                      </div>
                    )}
                    {selectedLog.targetId && (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Target ID</p>
                        <p className="text-[13px] font-mono font-bold text-primary">{selectedLog.targetId}</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "errors" && (
                  <>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Error Name</p>
                      <p className="text-[14px] font-bold text-red-600 dark:text-red-400">{selectedLog.errorName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Error Message</p>
                      <p className="text-[14px] font-medium text-primary bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 border border-red-100 dark:border-red-900/50 break-all">{selectedLog.errorMessage}</p>
                    </div>
                    {selectedLog.stackTrace && (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Stack Trace</p>
                        <pre className="text-[11px] font-mono text-primary bg-surface-hover rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap max-h-48 no-scrollbar">{selectedLog.stackTrace}</pre>
                      </div>
                    )}
                    {selectedLog.pathname && (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Pathname</p>
                        <p className="text-[13px] font-mono font-bold text-primary">{selectedLog.pathname}</p>
                      </div>
                    )}
                    {selectedLog.userName && (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">User</p>
                        <p className="text-[14px] font-bold text-primary">{selectedLog.userName}</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "access" && (
                  <>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Method</p>
                      <p className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-[12px] font-black text-emerald-700 dark:text-emerald-400 font-mono">{selectedLog.method}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Pathname</p>
                      <p className="text-[13px] font-mono font-bold text-primary break-all">{selectedLog.pathname}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">IP Address</p>
                        <p className="text-[13px] font-mono font-bold text-primary">{selectedLog.ipAddress || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">User Agent</p>
                        <p className="text-[13px] font-mono font-bold text-primary break-all">{selectedLog.userAgent || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Username</p>
                      <p className="text-[14px] font-bold text-primary">{selectedLog.userName || "Guest"}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full rounded-full bg-surface-hover py-3 text-[14px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90 border border-card-border"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prune Modal */}
      <AnimatePresence>
        {showPruneModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPruneModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-sm rounded-[32px] bg-card p-6 shadow-2xl border border-card-border"
            >
              <h3 className="text-lg font-black text-primary mb-1">Prune Logs</h3>
              <p className="text-[13px] text-secondary mb-5">Delete log entries older than N days to free up space.</p>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2">Log Type</p>
                  <div className="flex gap-2">
                    {["all", "activity", "errors", "access"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setPruneType(t)}
                        className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all active:scale-90 ${
                          pruneType === t
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-surface-hover text-secondary hover:text-primary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2">Delete entries older than</p>
                  <div className="flex gap-2">
                    {[30, 60, 90, 180, 365].map((d) => (
                      <button
                        key={d}
                        onClick={() => setPruneDays(d)}
                        className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all active:scale-90 ${
                          pruneDays === d
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-surface-hover text-secondary hover:text-primary"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPruneModal(false)}
                  className="flex-1 btn-outline text-[13px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrune}
                  disabled={pruning}
                  className="flex-[2] btn-danger text-[13px]"
                >
                  {pruning ? "Deleting..." : `Delete ${pruneType} logs >${pruneDays}d`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
