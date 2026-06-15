"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

interface StatsData {
  totalCustomers: number;
  pinned: number;
  unpinned: number;
  visited: number;
  unvisited: number;
  withPhone: number;
  withoutPhone: number;
  noCluster: number;
  totalClusters: number;
  totalVisits: number;
  totalDeliveries: number;
  avgVisits: string;
  clusterBreakdown: { id: string; name: string; customer_count: number }[];
  tierBreakdown: { tier_new: number; tier_regular: number; tier_frequent: number };
  topVisited: { id: string; name: string; visit_count: number }[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};

export default function CustomerStatsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={t("customer.stats_title")} />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-surface-hover rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface-hover rounded-[24px]" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={t("customer.stats_title")} />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <p className="text-secondary text-[13px] font-medium">Failed to load stats</p>
        </main>
      </div>
    );
  }

  const overviewCards = [
    {
      label: t("customer.stats_total"), value: data.totalCustomers, color: "from-blue-500 to-indigo-600",
      icon: (
        <Icon name="person" size={20} />
      ),
    },
    {
      label: t("customer.stats_pinned"), value: data.pinned, color: "from-emerald-500 to-teal-600",
      icon: (
        <Icon name="map-pin" size={20} />
      ),
    },
    {
      label: t("customer.stats_visited"), value: data.visited, color: "from-violet-500 to-purple-600",
      icon: (
        <Icon name="check-circle" size={20} />
      ),
    },
    {
      label: t("customer.stats_total_visits"), value: data.totalVisits, color: "from-amber-500 to-orange-600",
      icon: (
        <Icon name="chart" size={20} />
      ),
    },
    {
      label: t("customer.stats_total_clusters"), value: data.totalClusters, color: "from-cyan-500 to-blue-600",
      icon: (
        <Icon name="layers" size={20} />
      ),
    },
    {
      label: t("customer.stats_total_deliveries"), value: data.totalDeliveries, color: "from-rose-500 to-pink-600",
      icon: (
        <Icon name="package" size={20} />
      ),
    },
  ];

  const dqGradients = [
    "from-emerald-400 to-emerald-500",
    "from-amber-400 to-amber-500",
    "from-orange-400 to-orange-500",
    "from-red-400 to-red-500",
  ];
  const dqColors = [
    "text-emerald-600 dark:text-emerald-400",
    "text-amber-600 dark:text-amber-400",
    "text-orange-600 dark:text-orange-400",
    "text-red-600 dark:text-red-400",
  ];
  const dataQualityCards = [
    { label: t("customer.stats_with_phone"), value: data.withPhone, total: data.totalCustomers },
    { label: t("customer.stats_unpinned"), value: data.unpinned, total: data.totalCustomers },
    { label: t("customer.stats_unvisited"), value: data.unvisited, total: data.totalCustomers },
    { label: t("customer.stats_no_cluster"), value: data.noCluster, total: data.totalCustomers },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={t("customer.stats_title")} />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-extrabold tracking-tight text-primary"
        >
          {t("customer.stats_title")}
        </motion.h1>

        {/* Overview Grid */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
          {overviewCards.map((card, i) => (
            <motion.div
              key={i}
              variants={item}
              className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${card.color} text-white text-lg mb-3`}>
                {card.icon}
              </div>
              <p className="text-[28px] font-black text-primary">{card.value}</p>
              <p className="text-[11px] font-medium text-secondary mt-1 uppercase tracking-wider">{card.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Data Quality */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 25 }}
          className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
        >
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">
            {t("customer.stats_data_quality")}
          </h2>
          <div className="space-y-3">
            {dataQualityCards.map((card, i) => {
              const pct = card.total > 0 ? Math.round((card.value / card.total) * 100) : 0;
              return (
                <div key={card.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-secondary">{card.label}</span>
                    <span className={`text-[12px] font-black ${dqColors[i]}`}>
                      {card.value}/{card.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${dqGradients[i]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tier Breakdown */}
        {data.tierBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
          >
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">
              {t("customer.stats_tier_breakdown")}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("customer.tier_new"), value: data.tierBreakdown.tier_new, color: "from-blue-400 to-blue-500" },
                { label: t("customer.tier_regular"), value: data.tierBreakdown.tier_regular, color: "from-violet-400 to-purple-500" },
                { label: t("customer.tier_frequent"), value: data.tierBreakdown.tier_frequent, color: "from-amber-400 to-orange-500" },
              ].map((tier) => (
                <div key={tier.label} className="text-center rounded-2xl bg-surface-hover p-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${tier.color} text-white text-[13px] font-black mb-2`}>
                    {tier.value}
                  </div>
                  <p className="text-[11px] font-bold text-secondary uppercase tracking-wider">{tier.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-medium text-secondary/60 mt-3 text-center">
              {t("customer.stats_visit_avg")}: {data.avgVisits}
            </p>
          </motion.div>
        )}

        {/* Top Visited */}
        {data.topVisited && data.topVisited.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
          >
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">
              {t("customer.stats_top_visited")}
            </h2>
            <div className="space-y-2">
              {data.topVisited.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface-hover px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[11px] font-black">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[13px] font-bold text-primary truncate">{c.name}</p>
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">{c.visit_count}x</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cluster Breakdown */}
        {data.clusterBreakdown && data.clusterBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
          >
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-4">
              {t("customer.stats_per_cluster")}
            </h2>
            <div className="space-y-3">
              {data.clusterBreakdown.map((cl) => {
                const maxCount = Math.max(...data.clusterBreakdown.map(c => c.customer_count));
                const pct = maxCount > 0 ? (cl.customer_count / maxCount) * 100 : 0;
                return (
                  <div key={cl.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold text-primary truncate">{cl.name}</span>
                      <span className="text-[11px] font-black text-secondary">{cl.customer_count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
