// components/AdminAnalytics.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";

type LogType = "activity" | "errors" | "access";

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<LogType>("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  useScrollLock(selectedLog !== null);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      setFetchError("");
      try {
        const res = await fetchWithTimeout(`/api/admin/system/logs?type=${activeTab}`, {}, 30000);
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const data = await res.json();
        setLogs(data.logs);
      } catch (err: any) {
        if (err.name === "AbortError") {
          setFetchError("Request timed out.");
        } else {
          setFetchError(err.message || "Failed to load.");
        }
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [activeTab, refreshKey]);

  return (
    <div className="px-4 sm:px-6">
      {/* TABS */}
      <div className="mb-6 flex rounded-full bg-surface-hover p-1 shadow-inner ring-1 ring-black/5 dark:ring-white/5 max-w-md mx-auto">
        {(["activity", "errors", "access"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full py-2.5 text-[12px] font-black uppercase tracking-wider transition-all active:scale-90 ${
              activeTab === tab ? "bg-card text-blue-600 dark:text-blue-400 shadow-sm" : "text-secondary hover:text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FEED CONTAINER */}
      <div className={`rounded-[32px] border border-card-border shadow-sm overflow-hidden mb-12 transition-all duration-500 ${activeTab === 'access' ? 'bg-[#0f172a] border-slate-700' : 'bg-card'}`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${activeTab === 'access' ? 'border-slate-800 bg-slate-900/50' : 'border-card-border'}`}>
          <div className="flex items-center gap-3">
            {activeTab === 'access' && (
                <div className="flex gap-1.5 mr-2">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                    <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                </div>
            )}
            <h3 className={`font-black uppercase tracking-wider text-[13px] ${activeTab === 'access' ? 'text-slate-400 font-mono' : 'text-primary'}`}>
                {activeTab === 'activity' ? "System Activity Feed" : 
                activeTab === 'errors' ? "Application Error Log" : "Mainframe Traffic Stream"}
            </h3>
          </div>
          {isLoading && <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
          {activeTab === 'access' && !isLoading && <span className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase">● Live_Connect</span>}
        </div>
        
        <div className={`max-h-[500px] overflow-y-auto custom-scrollbar ${activeTab === 'access' ? 'divide-y divide-slate-800/50 p-2 font-mono overflow-x-auto' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={activeTab !== 'access' ? "relative" : ""}
            >
              {isLoading ? (
                <div className="p-20 text-center text-secondary font-bold">
                  <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-surface-hover text-2xl border border-card-border mx-auto mb-4">
                    ⏳
                  </div>
                  {t("action.loading")}
                </div>
              ) : (
                <>
                {activeTab !== 'access' && (
                  <div className="absolute left-[27px] top-0 bottom-0 w-[2px] bg-card-border" />
                )}
                {logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={activeTab === 'access' 
                        ? "px-3 py-1.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        : "relative pl-14 pr-6 py-4 hover:bg-surface-hover transition-colors cursor-pointer"
                    }
                  >
                    {activeTab === 'access' ? (
                        <div className="flex items-center gap-2 py-1.5 w-full text-[11px] font-mono">
                            <span className="text-slate-500 w-[90px] shrink-0">[{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })}]</span>
                            <span className="text-slate-400 w-[130px] shrink-0 truncate">{log.ipAddress || "N/A"}</span>
                            <span className="text-emerald-400 font-black w-[50px] shrink-0">{log.method}</span>
                            <span className="text-slate-100 font-bold flex-1 shrink-0">{log.pathname}</span>
                            <span className="text-blue-400 opacity-80 w-[100px] shrink-0 text-right truncate">@{log.userName || "Guest"}</span>
                        </div>
                    ) : (
                        <>
                            <div className={`absolute left-[21px] top-[22px] h-3 w-3 rounded-full border-2 border-card ring-4 ${
                                activeTab === 'errors' ? "bg-red-500 ring-red-500/10" :
                                log.action?.includes("DELETE") ? "bg-red-500 ring-red-500/10" : 
                                log.action?.includes("CREATE") ? "bg-emerald-500 ring-emerald-500/10" : "bg-blue-500 ring-blue-500/10"
                            }`} />
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[14px] font-black text-primary truncate">
                                {log.userName || log.ipAddress || "System"}
                                <span className="font-medium text-secondary mx-2">•</span>
                                {activeTab === 'activity' && <span className="text-blue-600 dark:text-blue-400">{log.action}</span>}
                                {activeTab === 'errors' && <span className="text-red-600">{log.errorName}</span>}
                                </p>
                                <p className="text-[11px] font-medium text-secondary whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                                </p>
                            </div>
                            
                            {activeTab === 'activity' && log.details && (
                                <p className="text-[12px] font-medium text-secondary/70 mt-1 italic truncate">{log.details}</p>
                            )}
                            
                            {activeTab === 'errors' && (
                                <p className="text-[12px] font-medium text-red-600/80 mt-1 line-clamp-2">{log.errorMessage}</p>
                            )}
                        </>
                    )}
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="p-12 text-center">
                    {fetchError ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-[14px] font-bold text-red-600">{fetchError}</p>
                        <button onClick={() => setRefreshKey(k => k + 1)} className="rounded-xl bg-blue-600 px-5 py-2 text-[12px] font-bold text-white active:scale-90">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <p className="text-secondary font-medium">{t("search.no_results")}</p>
                    )}
                  </div>
                )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* LOG DETAIL MODAL */}
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
              className="relative w-full max-w-lg rounded-[32px] bg-card p-6 shadow-2xl border border-card-border max-h-[85vh] overflow-y-auto custom-scrollbar"
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
                {/* Timestamp — common to all */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Timestamp</p>
                  <p className="text-[14px] font-bold text-primary">{new Date(selectedLog.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Jakarta" })}</p>
                </div>

                {/* Log ID */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Log ID</p>
                  <p className="text-[13px] font-mono font-bold text-primary">{selectedLog.id}</p>
                </div>

                {/* Activity-specific fields */}
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

                {/* Error-specific fields */}
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
                        <pre className="text-[11px] font-mono text-primary bg-surface-hover rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap max-h-48 custom-scrollbar">{selectedLog.stackTrace}</pre>
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

                {/* Access-specific fields */}
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
    </div>
  );
}
