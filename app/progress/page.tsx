"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { motion } from "framer-motion";
import DeliveryChart from "@/components/DeliveryChart";

interface Session {
  id: string;
  date: string;
  totalPackages: string;
  deliveredPackages: string;
  createdAt: string;
  finalized: boolean;
  incomings: any[];
  deliveries: any[];
}

interface DayData {
  date: string;
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

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  useEffect(() => {
    Promise.all([fetchSessions(), fetchAnalytics()]);
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.warn("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/sessions/analytics");
      if (res.ok) {
        const data = await res.json();
        setChartData(data.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch analytics", err);
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            {t("session.new")}
          </motion.button>
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
            {chartData.length > 0 && <DeliveryChart data={chartData} />}
            {sessions.map((s, i) => {
              const progress = calcProgress(s);
              const total = Number(s.totalPackages) || 0;
              const delivered = Number(s.deliveredPackages) || 0;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
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
