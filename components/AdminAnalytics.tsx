// components/AdminAnalytics.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

type LogType = "activity" | "errors" | "access";

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<LogType>("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/system/logs?type=${activeTab}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [activeTab]);

  return (
    <div className="px-4 sm:px-6">
      {/* TABS */}
      <div className="mb-6 flex rounded-full bg-surface-hover p-1 shadow-inner ring-1 ring-black/5 dark:ring-white/5 max-w-md mx-auto">
        {(["activity", "errors", "access"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full py-2.5 text-[12px] font-black uppercase tracking-wider transition-all active:scale-95 ${
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
        
        <div className={`divide-y max-h-[500px] overflow-y-auto custom-scrollbar ${activeTab === 'access' ? 'divide-slate-800/50 p-2 font-mono' : 'divide-card-border'}`}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-20 text-center text-secondary font-bold"
              >
                {t("action.loading")}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={activeTab === 'access' 
                        ? "py-1.5 px-2 flex flex-row items-center gap-3 text-[11px] whitespace-nowrap hover:bg-slate-800/40 transition-colors overflow-x-auto no-scrollbar"
                        : "px-6 py-4 flex items-start gap-4 hover:bg-surface-hover transition-colors border-b border-card-border last:border-0"
                    }
                  >
                    {activeTab !== 'access' && (
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        activeTab === 'errors' ? "bg-red-500" :
                        log.action?.includes("DELETE") ? "bg-red-500" : 
                        log.action?.includes("CREATE") ? "bg-emerald-500" : "bg-blue-500"
                        }`} />
                    )}

                    {/* TERMINAL STYLE FOR ACCESS LOGS */}
                    {activeTab === 'access' ? (
                        <>
                            <span className="text-slate-500 shrink-0">[{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour12: false })}]</span>
                            <span className="text-emerald-400 font-black shrink-0 w-8">{log.method}</span>
                            <span className="text-slate-100 shrink-0 font-bold">{log.pathname}</span>
                            <span className="text-blue-400 shrink-0 opacity-80">@{log.userName || "Guest"}</span>
                            <span className="text-slate-600 shrink-0 text-[10px] italic">({log.ipAddress})</span>
                        </>
                    ) : (
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[14px] font-black text-primary truncate">
                                {log.userName || log.ipAddress || "System"}
                                <span className="font-medium text-secondary mx-2">•</span>
                                {activeTab === 'activity' && <span className="text-blue-600 dark:text-blue-400">{log.action}</span>}
                                {activeTab === 'errors' && <span className="text-red-600">{log.errorName}</span>}
                                </p>
                                <p className="text-[11px] font-medium text-secondary whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            
                            {activeTab === 'activity' && log.details && (
                                <p className="text-[12px] font-medium text-secondary/70 mt-1 italic truncate">{log.details}</p>
                            )}
                            
                            {activeTab === 'errors' && (
                                <p className="text-[12px] font-medium text-red-600/80 mt-1 line-clamp-2">{log.errorMessage}</p>
                            )}
                        </div>
                    )}
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="p-12 text-center">
                      <p className="text-secondary font-medium">{t("search.no_results")}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
