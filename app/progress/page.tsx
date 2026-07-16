"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import SessionDayChart from "@/components/SessionDayChart";

interface Session {
  id: string;
  date: string;
  totalPackages: string;
  deliveredPackages: string;
  createdAt: string;
  finalized: boolean;
}

interface DayData {
  date: string;
  month: string;
  total: number;
  delivered: number;
}

export default function ProgressDashboard() {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
  });
  const [searchText, setSearchText] = useState("");

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  function shiftMonth(month: string, direction: "prev" | "next"): string {
    const [y, m] = month.split("-").map(Number);
    if (direction === "prev") {
      if (m === 1) return `${y - 1}-12`;
      return `${y}-${String(m - 1).padStart(2, "0")}`;
    }
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  function isMonthFuture(month: string): boolean {
    const current = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
    return month > current;
  }

  function getMonthRange(month: string) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      dateFrom: `${month}-01`,
      dateEnd: `${month}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  function formatMonth(month: string): string {
    const d = new Date(month + "-01T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
  }

  useEffect(() => {
    fetchSessions();
  }, [currentMonth]);

  useEffect(() => {
    function handleFocus() {
      fetchRef.current();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    function handlePopState() {
      fetchRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleFilterChange() {
    fetchSessions();
  }

  function clearSearch() {
    setSearchText("");
    setTimeout(() => fetchSessions(), 0);
  }

  const fetchRef = useRef(fetchSessions);
  fetchRef.current = fetchSessions;

  async function fetchSessions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const range = getMonthRange(currentMonth);
      params.set("dateFrom", range.dateFrom);
      params.set("dateTo", range.dateEnd);
      if (searchText) params.set("search", searchText);
      const qs = params.toString();
      const res = await fetch(`/api/sessions${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setChartData(data.analytics || []);
      } else {
        showToast("Failed to fetch sessions", "error");
      }
    } catch {
      showToast("Failed to fetch sessions", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewSession() {
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(t("session.new_created"), "success");
        router.push(`/progress/${data.id}`);
      } else {
        showToast("Failed to create session", "error");
      }
    } catch {
      showToast("Failed to create session", "error");
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(dateLocale, {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta"
    });
  }

  function calcProgress(s: Session) {
    const total = Number(s.totalPackages) || 0;
    const delivered = Number(s.deliveredPackages) || 0;
    return total > 0 ? Math.round((delivered / total) * 100) : 0;
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Sessions" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">
              {t("session.dashboard_title")}
            </h1>
            <p className="text-[13px] font-medium text-secondary mt-1">
              {t("session.dashboard_subtitle")}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNewSession}
            disabled={creating}
            className="btn-primary shrink-0"
          >
            {creating ? (
              <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Icon name="plus" size={20} />
            )}
            {t("session.new")}
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleFilterChange(); }}
            placeholder={t("session.search_placeholder")}
            className="w-full rounded-2xl bg-card border border-card-border px-4 py-2.5 pl-10 text-[13px] font-medium text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60">
            <Icon name="search" size={16} />
          </span>
          {searchText && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-surface-hover text-secondary/60"
            >
              <Icon name="close" size={12} />
            </motion.button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[24px] bg-card p-6 border border-card-border animate-pulse">
                <div className="h-5 w-48 bg-surface-hover rounded-full mb-3" />
                <div className="h-3 w-32 bg-surface-hover rounded-full mb-4" />
                <div className="h-2 w-full bg-surface-hover rounded-full" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-[24px] bg-card border border-card-border p-10 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-[15px] font-medium text-secondary">
              {t("session.no_sessions")}
            </p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNewSession}
              disabled={creating}
              className="btn-primary mt-6"
            >
              {t("session.new")}
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {chartData.length > 0 && (
              <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setCurrentMonth(shiftMonth(currentMonth, "prev"))}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-hover text-secondary hover:bg-card-border transition-colors"
                  >
                    <Icon name="chevron-left" size={16} />
                  </motion.button>
                  <span className="text-[15px] font-bold text-primary">
                    {formatMonth(currentMonth)}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setCurrentMonth(shiftMonth(currentMonth, "next"))}
                    disabled={isMonthFuture(shiftMonth(currentMonth, "next"))}
                    className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${
                      isMonthFuture(shiftMonth(currentMonth, "next"))
                        ? "bg-surface-hover text-secondary/30 cursor-not-allowed"
                        : "bg-surface-hover text-secondary hover:bg-card-border"
                    }`}
                  >
                    <Icon name="chevron-right" size={16} />
                  </motion.button>
                </div>
                <SessionDayChart data={chartData.filter(d => d.month === currentMonth)} />
              </div>
            )}
            {sessions.map((s, i) => {
              const progress = calcProgress(s);
              const total = Number(s.totalPackages) || 0;
              const delivered = Number(s.deliveredPackages) || 0;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.2, ease: "easeOut" }}
                >
                  <Link
                    href={`/progress/${s.id}`}
                    className="block rounded-[24px] bg-card border border-card-border p-6 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-90"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[15px] font-bold text-primary">
                          {formatDate(s.date)}
                          {s.finalized && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
                              {t("session.finalized_badge")}
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] font-medium text-secondary mt-1">
                          {total} {t("session.packages")} · {delivered} {t("session.delivered")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[22px] font-black text-primary">{progress}%</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
