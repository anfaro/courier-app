"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";

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

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  useEffect(() => {
    fetch("/api/earnings")
      .then((res) => res.ok ? res.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, {
      weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
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

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />
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
            <div className="h-24 w-full bg-surface-hover rounded-[32px]" />
            <div className="h-4 w-48 bg-surface-hover rounded-full" />
            <div className="h-20 w-full bg-surface-hover rounded-[20px]" />
          </div>
        ) : data ? (
          <>
            {/* Hero Total */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-[32px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 text-white shadow-xl shadow-emerald-600/20"
            >
              <p className="text-[13px] font-black uppercase tracking-widest text-emerald-100 mb-2">
                {t("earnings.total_earnings")}
              </p>
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
        ) : (
          <div className="rounded-[24px] bg-card border border-card-border p-10 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-[15px] font-medium text-secondary">
              {t("earnings.no_sessions")}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
