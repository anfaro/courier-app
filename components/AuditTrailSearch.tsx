// components/AuditTrailSearch.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

type LogTab = "activity" | "errors" | "access";

export default function AuditTrailSearch() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<LogTab>("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [jumpInput, setJumpInput] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fetchKey, setFetchKey] = useState(0);
  const [fetchErr, setFetchErr] = useState("");
  const [selectedError, setSelectedError] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setFetchErr("");
    try {
      const params = new URLSearchParams({ type: tab, page: String(page), pageSize: String(pageSize) });
      if (search) params.set("q", search);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetchWithTimeout(`/api/admin/system/logs?${params}`, {}, 120000);
      if (!res.ok) { setFetchErr(`Server error (${res.status})`); setLogs([]); return; }
      const data = await res.json();
      setLogs(data.logs || []);
      setHasMore(data.hasMore ?? false);
    } catch (e: any) {
      setFetchErr(e.message || "Request failed.");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab, page, pageSize, search, fromDate, toDate, fetchKey]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (page !== 0 || search || fromDate || toDate) return;
    const interval = setInterval(() => setFetchKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, [page, search, fromDate, toDate]);

  const handleSearch = () => { setPage(0); setFetchKey(k => k + 1); };

  return (
    <div className="px-4 sm:px-6 mb-8">
      <h2 className="text-[14px] font-bold tracking-tight text-primary uppercase tracking-widest opacity-60 mb-4">Audit Trail Search</h2>

      <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-card-border space-y-4">
          <div className="flex gap-2">
            {(["activity", "errors", "access"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setPage(0); setSearch(""); setFromDate(""); setToDate(""); }} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all active:scale-90 ${tab === t ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm" : "bg-surface-hover text-secondary hover:text-primary"}`}>{t}</button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder={tab === "access" ? "Search path, IP, or user..." : "Search action, details, or user..."} className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-[13px] font-medium text-primary focus:border-blue-500 focus:outline-none placeholder:text-secondary" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={handleSearch} className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-bold text-white active:scale-90 transition-all shrink-0">Search</button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-secondary">From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-card-border bg-gray-50 dark:bg-slate-800 px-3 py-2 text-[12px] text-primary focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-secondary">To</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-card-border bg-gray-50 dark:bg-slate-800 px-3 py-2 text-[12px] text-primary focus:border-blue-500 focus:outline-none" />
            </div>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(""); setToDate(""); setPage(0); }} className="text-[11px] font-bold text-red-500 active:scale-90 transition-transform">Clear dates</button>
            )}
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {fetchErr ? (
            <div className="p-8 text-center">
              <p className="text-[13px] font-bold text-red-500 mb-3">{fetchErr}</p>
              <button onClick={() => { setPage(0); setFetchKey(k => k + 1); }} className="rounded-xl bg-blue-600 px-5 py-2 text-[12px] font-bold text-white active:scale-90">Retry</button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-secondary font-medium">{t("search.no_results")}</div>
          ) : tab === "access" ? (
            <div className="divide-y divide-card-border">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[11px] font-mono text-secondary/60">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${
                      log.method === "GET" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" :
                      log.method === "POST" ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" :
                      log.method === "PUT" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400" :
                      log.method === "DELETE" ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400" :
                      "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}>{log.method}</span>
                  </div>
                  <p className="text-[13px] font-bold text-primary break-all leading-snug">{log.pathname}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-slate-400">{log.ipAddress || "N/A"}</span>
                    <span className="text-[10px] font-medium text-secondary/50">·</span>
                    <span className="text-[10px] font-medium text-secondary/60">@{log.userName || "Guest"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "activity" ? (
            <div className="divide-y divide-card-border">
              {logs.map((log) => {
                const isCreate = log.action?.includes("CREATE");
                const isDelete = log.action?.includes("DELETE");
                const isUpdate = log.action?.includes("UPDATE");
                const isLogin = log.action?.includes("LOGIN");
                const isUpload = log.action?.includes("IMAGE");
                const isBulk = log.action?.includes("BULK");
                const isRestore = log.action?.includes("RESTORE");

                const icon = isCreate ? "＋" : isDelete ? "✕" : isUpdate ? "✎" : isLogin ? "🔑" : isUpload ? "🖼" : isBulk ? "📋" : isRestore ? "↻" : "⚡";
                const actionLabel = log.action
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Unknown";

                const ts = new Date(log.createdAt);
                const now = Date.now();
                const diff = now - ts.getTime();
                const relative = diff < 60000 ? "Just now" :
                  diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` :
                  diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago` :
                  ts.toLocaleDateString("id-ID", { weekday: "short", month: "short", day: "numeric" });

                const color = isDelete ? "bg-red-500" : isCreate ? "bg-emerald-500" : isLogin ? "bg-amber-500" : isUpload ? "bg-teal-500" : isBulk ? "bg-slate-500" : isRestore ? "bg-orange-500" : "bg-blue-500";
                const bgColor = isDelete ? "bg-red-50 dark:bg-red-950/20" : isCreate ? "bg-emerald-50 dark:bg-emerald-950/20" : isLogin ? "bg-amber-50 dark:bg-amber-950/20" : isUpload ? "bg-teal-50 dark:bg-teal-950/20" : "bg-blue-50 dark:bg-blue-950/20";

                return (
                  <div key={log.id} className="group px-5 py-4 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${bgColor} ${color} ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                        {icon}
                      </div>
                      <span className="font-medium text-secondary/70 text-[12px]">{actionLabel}</span>
                      <span className="ml-auto text-[11px] font-mono text-secondary/40 shrink-0" title={ts.toLocaleString("id-ID")}>{relative}</span>
                    </div>
                    <p className="text-[13px] font-bold text-primary leading-snug">{log.userName || "System"}</p>
                    {log.details && <p className="text-[12px] text-secondary/70 mt-1 leading-relaxed break-words">{log.details}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {logs.map((log) => (
                <div key={log.id} onClick={() => setSelectedError(log)} className="px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer active:scale-[0.99]">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      log.action?.includes("DELETE") ? "bg-red-500" :
                      log.action?.includes("CREATE") ? "bg-emerald-500" : "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-primary text-[13px]">{log.userName || "System"}</span>
                        <span className="text-secondary/40">•</span>
                        <span className="font-bold text-red-600 text-[12px]">{log.errorName}</span>
                        <span className="text-[11px] text-secondary/60 ml-auto">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                      </div>
                      <p className="text-[12px] text-red-600/80 mt-0.5 line-clamp-2">{log.errorMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(page > 0 || hasMore) && (
          <div className="flex items-center justify-center gap-2 border-t border-card-border px-4 py-3">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || isLoading} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-primary font-bold transition-all active:scale-90 disabled:opacity-30 text-[15px]">‹</button>
            <input type="number" min={1} value={jumpInput} onChange={e => setJumpInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { const p = parseInt(e.currentTarget.value); if (!isNaN(p) && p >= 1) { setPage(p - 1); setJumpInput(""); } } }} onBlur={() => setJumpInput("")} className="w-12 text-center text-[13px] font-bold text-secondary bg-transparent border border-transparent focus:border-purple-500 focus:bg-card rounded-lg px-1 py-0.5 outline-none" placeholder={String(page + 1)} />
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || isLoading} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-primary font-bold transition-all active:scale-90 disabled:opacity-30 text-[15px]">›</button>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); setJumpInput(""); }}
              className="ml-1 rounded-xl bg-surface-hover px-2 py-1.5 text-[11px] font-bold text-primary border border-card-border outline-none cursor-pointer active:scale-90 transition-all"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedError(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-[28px] bg-card p-6 shadow-2xl border border-card-border max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-primary">Error Details</h3>
              <button onClick={() => setSelectedError(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-secondary hover:text-primary transition-all active:scale-90">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-black text-secondary uppercase tracking-widest">Error Name</span>
                <p className="mt-1 text-[15px] font-bold text-red-600 break-words">{selectedError.errorName}</p>
              </div>

              <div>
                <span className="text-[11px] font-black text-secondary uppercase tracking-widest">Message</span>
                <p className="mt-1 text-[14px] font-medium text-primary whitespace-pre-wrap break-words">{selectedError.errorMessage}</p>
              </div>

              {selectedError.stackTrace && (
                <div>
                  <span className="text-[11px] font-black text-secondary uppercase tracking-widest">Stack Trace</span>
                  <pre className="mt-1 rounded-2xl bg-surface-hover p-4 text-[11px] font-mono text-primary leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar">{selectedError.stackTrace}</pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-card-border">
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">User</span>
                  <p className="mt-0.5 text-[13px] font-bold text-primary">{selectedError.userName || "System"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">User ID</span>
                  <p className="mt-0.5 text-[13px] font-mono text-secondary">{selectedError.userId || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Path</span>
                  <p className="mt-0.5 text-[13px] font-mono text-secondary break-all">{selectedError.pathname || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Timestamp</span>
                  <p className="mt-0.5 text-[13px] font-bold text-primary">{new Date(selectedError.createdAt).toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
