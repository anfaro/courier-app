"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { shiftPeriod, isCurrentPeriod, isAfterToday } from "@/lib/earnings";
import Icon from "@/components/Icon";

interface DailyBreakdown {
  date: string;
  delivered: number;
  earnings: number;
}

interface EarningsData {
  totalDelivered: number;
  totalEarnings: number;
  ratePerPackage: number;
  cutoffStart: string;
  cutoffEnd: string;
  dailyBreakdown: DailyBreakdown[];
}

export default function EarningsPage() {
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cutoffStart, setCutoffStart] = useState("");
  const [cutoffEnd, setCutoffEnd] = useState("");

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  const fetchEarnings = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/earnings?start=${start}&end=${end}`);
      if (res.ok) {
        const d: EarningsData = await res.json();
        setData(d);
        setCutoffStart(d.cutoffStart);
        setCutoffEnd(d.cutoffEnd);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load from current period (no params = server computes)
    setLoading(true);
    setError(false);
    fetch("/api/earnings")
      .then((res) => res.ok ? res.json() : null)
      .then((d: EarningsData | null) => {
        if (d) {
          setData(d);
          setCutoffStart(d.cutoffStart);
          setCutoffEnd(d.cutoffEnd);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, {
      weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
    });
  }

  function formatDateShort(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, {
      weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Jakarta"
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatCurrencyCompact(amount: number) {
    if (amount >= 1000000) return `Rp${(amount / 1000000).toFixed(1)}jt`;
    if (amount >= 1000) return `Rp${(amount / 1000).toFixed(0)}rb`;
    return `Rp${amount}`;
  }

  const isCurrent = cutoffStart ? isCurrentPeriod(cutoffStart, cutoffEnd) : false;
  const isNext = cutoffStart ? isAfterToday(cutoffStart) : false;

  function handlePrev() {
    if (!cutoffStart || !cutoffEnd) return;
    const prev = shiftPeriod(cutoffStart, cutoffEnd, "prev");
    setCutoffStart(prev.start);
    setCutoffEnd(prev.end);
    fetchEarnings(prev.start, prev.end);
  }

  function handleNext() {
    if (!cutoffStart || !cutoffEnd) return;
    const next = shiftPeriod(cutoffStart, cutoffEnd, "next");
    setCutoffStart(next.start);
    setCutoffEnd(next.end);
    fetchEarnings(next.start, next.end);
  }

  const maxEarnings = data && data.dailyBreakdown.length > 0
    ? Math.max(...data.dailyBreakdown.map((d) => d.earnings))
    : 0;

  const bestDay = data && data.dailyBreakdown.length > 0
    ? data.dailyBreakdown.reduce((best, d) => d.earnings > best.earnings ? d : best, data.dailyBreakdown[0])
    : null;

  const dailyAvg = data && data.dailyBreakdown.length > 0
    ? Math.round(data.totalEarnings / data.dailyBreakdown.length)
    : 0;

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Earnings" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            {t("earnings.title")}
          </h1>
          <p className="text-[13px] font-medium text-secondary mt-1">
            {t("earnings.per_package_rate").replace("[RATE]", data ? formatCurrency(data.ratePerPackage) : "...")}
          </p>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 w-full bg-surface-hover rounded-[32px]" />
            <div className="flex gap-3">
              <div className="h-20 flex-1 bg-surface-hover rounded-[20px]" />
              <div className="h-20 flex-1 bg-surface-hover rounded-[20px]" />
              <div className="h-20 flex-1 bg-surface-hover rounded-[20px]" />
            </div>
            <div className="h-48 w-full bg-surface-hover rounded-[20px]" />
            <div className="h-20 w-full bg-surface-hover rounded-[20px]" />
          </div>
        ) : error ? (
          <div className="rounded-[24px] bg-card border border-card-border p-10 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-[15px] font-medium text-secondary mb-4">
              {t("earnings.fetch_error")}
            </p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (cutoffStart && cutoffEnd) {
                  fetchEarnings(cutoffStart, cutoffEnd);
                } else {
                  window.location.reload();
                }
              }}
              className="btn-primary"
            >
              {t("earnings.retry")}
            </motion.button>
          </div>
        ) : data ? (
          <>
            {/* Hero Total + Period Nav */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-[32px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 text-white shadow-xl shadow-emerald-600/20"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-black uppercase tracking-widest text-emerald-100">
                  {t("earnings.total_earnings")}
                </p>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handlePrev}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                  >
                    <Icon name="chevron-left" size={16} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleNext}
                    disabled={isNext}
                    className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${
                      isNext
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    <Icon name="chevron-right" size={16} />
                  </motion.button>
                </div>
              </div>
              <p className="text-4xl sm:text-5xl font-black tracking-tight">
                {formatCurrency(data.totalEarnings)}
              </p>
              <p className="text-[13px] font-medium text-emerald-200 mt-2">
                {t("earnings.cutoff_period")
                  .replace("[START]", formatDate(data.cutoffStart))
                  .replace("[END]", formatDate(data.cutoffEnd))}
              </p>
              <p className="text-[12px] font-medium text-emerald-300/70 mt-1">
                {data.totalDelivered} {t("session.packages")} {t("session.delivered")}
              </p>
            </motion.div>

            {/* Summary Stat Cards */}
            {data.dailyBreakdown.length > 0 && (
              <div className="flex gap-3">
                <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">
                    {t("earnings.best_day")}
                  </p>
                  <p className="text-[18px] font-black text-primary leading-none">
                    {formatCurrencyCompact(bestDay?.earnings || 0)}
                  </p>
                  <p className="text-[10px] font-medium text-secondary mt-1">
                    {bestDay ? formatDateShort(bestDay.date) : "-"}
                  </p>
                </div>
                <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">
                    {t("earnings.daily_average")}
                  </p>
                  <p className="text-[18px] font-black text-primary leading-none">
                    {formatCurrencyCompact(dailyAvg)}
                  </p>
                  <p className="text-[10px] font-medium text-secondary mt-1">
                    {data.dailyBreakdown.length} {t("earnings.date").toLowerCase()}
                  </p>
                </div>
                <div className="flex-1 rounded-[20px] bg-card border border-card-border p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">
                    {t("earnings.total_sessions")}
                  </p>
                  <p className="text-[18px] font-black text-primary leading-none">
                    {data.dailyBreakdown.length}
                  </p>
                  <p className="text-[10px] font-medium text-secondary mt-1">
                    {data.totalDelivered} {t("session.packages")}
                  </p>
                </div>
              </div>
            )}

            {/* Mini Bar Chart */}
            {data.dailyBreakdown.length > 0 && (
              <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
                <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">
                  {t("earnings.amount")}
                </h2>
                <div className="space-y-3">
                  {data.dailyBreakdown.map((day, i) => {
                    const pct = maxEarnings > 0 ? (day.earnings / maxEarnings) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <p className="w-24 shrink-0 text-[11px] font-medium text-secondary leading-tight">
                          {formatDateShort(day.date)}
                        </p>
                        <div className="flex-1 h-6 rounded-full bg-surface-hover overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.04, type: "spring", stiffness: 150, damping: 18 }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          />
                        </div>
                        <p className="w-20 text-right text-[12px] font-bold text-primary shrink-0">
                          {formatCurrencyCompact(day.earnings)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per Day Breakdown */}
            {data.dailyBreakdown.length > 0 ? (
              <div>
                <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">
                  {t("earnings.per_day")}
                </h2>
                <div className="space-y-2">
                  {data.dailyBreakdown.map((day, i) => (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between rounded-[20px] bg-card border border-card-border p-4 shadow-sm"
                    >
                      <div>
                        <p className="text-[13px] font-bold text-primary">
                          {formatDate(day.date)}
                        </p>
                        <p className="text-[11px] font-medium text-secondary">
                          {t("earnings.delivered_count").replace("[N]", String(day.delivered))}
                        </p>
                      </div>
                      <p className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(day.earnings)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] bg-card border border-card-border p-10 text-center">
                <div className="text-5xl mb-4">💰</div>
                <p className="text-[15px] font-medium text-secondary">
                  {t("earnings.no_sessions")}
                </p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
