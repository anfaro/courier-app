// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { motion, type Variants } from "framer-motion";
import Icon from "@/components/Icon";

const cellVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25, delay: i * 0.05 },
  }),
};

export default function HomePage() {
  const { data: session } = useSession();
  const { t, locale } = useLanguage();
  const userName = session?.user?.name || "User";

  const [stats, setStats] = useState({ totalCustomers: 0, totalClusters: 0, totalVisits: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [earningsData, setEarningsData] = useState<{ totalEarnings: number; totalDelivered: number } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";
  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalCustomers: data.totalCustomers,
            totalClusters: data.totalClusters,
            totalVisits: data.totalVisits || 0,
          });
          setRecentVisits(data.recentVisits || []);
          if (data.earnings) {
            setEarningsData({
              totalEarnings: data.earnings.totalEarnings,
              totalDelivered: data.earnings.totalDelivered,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch dashboard data", err);
      } finally {
        setStatsLoaded(true);
        setEarningsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const statCards = [
    {
      href: "/customers",
      label: t("home.total_customers"),
      value: stats.totalCustomers,
      icon: "👥",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconText: "text-blue-600 dark:text-blue-400",
      surface: "surface-violet",
    },
    {
      href: "/clusters",
      label: t("home.total_clusters"),
      value: stats.totalClusters,
      icon: "📍",
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
      iconText: "text-orange-600 dark:text-orange-400",
      surface: "surface-peach",
    },
    {
      href: "/customers/stats",
      label: "Visits",
      value: stats.totalVisits,
      icon: "✓",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      iconText: "text-emerald-600 dark:text-emerald-400",
      surface: "surface-mint",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-xl p-4 sm:p-6 grid grid-cols-2 gap-3">

        {/* --- HERO WELCOME (full width) --- */}
        <motion.div
          custom={0}
          variants={cellVariants}
          initial="initial"
          animate="animate"
          className="col-span-2 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 surface-lavender p-6 shadow-xl shadow-blue-600/20"
        >
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl" />
          <div className="relative z-10">
            <p className="text-[12px] font-black uppercase tracking-widest text-blue-200 mb-1.5">
              {today}
            </p>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-white">
              {t("home.good_morning")}<br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
          </div>
        </motion.div>

        {/* --- STAT CARDS (3 in a row) --- */}
        {statCards.map((s, i) => (
          <motion.div key={s.href} custom={i + 1} variants={cellVariants} initial="initial" animate="animate" className="col-span-1">
            <Link
              href={s.href}
              className={`flex flex-col items-center justify-center rounded-[24px] bg-card border border-card-border p-4 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700 transition-all active:scale-90 h-full text-center group ${s.surface}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${s.iconBg} ${s.iconText} text-[16px] font-black mb-1.5 group-hover:scale-110 transition-transform`}>
                {s.icon}
              </div>
              <p className="text-[22px] leading-none font-black text-primary">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mt-1">{s.label}</p>
            </Link>
          </motion.div>
        ))}

        {/* --- EARNINGS WIDGET (full width) --- */}
        {!earningsLoading && (
          <motion.div custom={4} variants={cellVariants} initial="initial" animate="animate" className="col-span-2">
            {earningsData && earningsData.totalDelivered > 0 ? (
              <Link href="/earnings" className="block group">
                <div className="relative overflow-hidden rounded-[28px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-5 shadow-sm group-hover:shadow-md group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-all active:scale-90 surface-mint">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/40 dark:bg-emerald-900/30 blur-2xl" />
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                        {t("home.current_earnings")}
                      </p>
                      <p className="text-[26px] font-black text-emerald-800 dark:text-emerald-300 leading-none tracking-tight">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency", currency: "IDR",
                          minimumFractionDigits: 0, maximumFractionDigits: 0,
                        }).format(earningsData.totalEarnings)}
                      </p>
                      <p className="text-[12px] font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-1.5">
                        {earningsData.totalDelivered} {t("session.packages")} {t("session.delivered")}
                      </p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-[24px] group-hover:scale-110 transition-transform">
                      💰
                    </div>
                  </div>
                  <div className="relative z-10 mt-3 flex items-center gap-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                    {t("home.view_earnings")}
                    <Icon name="chevron-right" size={14} strokeWidth={3} />
                  </div>
                </div>
              </Link>
            ) : (
              <Link href="/earnings" className="block group">
                <div className="relative overflow-hidden rounded-[28px] bg-emerald-600 surface-mint p-5 shadow-lg shadow-emerald-600/20 transition-all active:scale-90">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors duration-500" />
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-emerald-100 mb-1">
                        {t("earnings.title")}
                      </p>
                      <p className="text-[20px] leading-tight font-black text-white tracking-tight">
                        {t("home.current_earnings")}
                      </p>
                      <p className="text-[12px] font-medium text-white opacity-80 mt-1">
                        Track your delivery performance &amp; salary
                      </p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 text-[24px] shadow-md group-hover:rotate-12 transition-transform">
                      💰
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </motion.div>
        )}

        {/* --- GET STARTED (empty state) --- */}
        {statsLoaded && stats.totalCustomers === 0 && (
          <motion.div
            custom={5}
            variants={cellVariants}
            initial="initial"
            animate="animate"
            className="col-span-2 rounded-[28px] bg-gradient-to-br from-blue-600 to-indigo-700 surface-lavender p-6 shadow-xl shadow-blue-600/20 text-white"
          >
            <h2 className="text-[20px] font-black tracking-tight mb-3">🚀 Get Started</h2>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[13px] font-black">1</span>
                <div>
                  <p className="text-[14px] font-bold">Add your first customer</p>
                  <p className="text-[12px] text-blue-200 mt-0.5">Create a customer with name, address, and location.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[13px] font-black">2</span>
                <div>
                  <p className="text-[14px] font-bold">Organize with clusters</p>
                  <p className="text-[12px] text-blue-200 mt-0.5">Group customers into clusters for better organization.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[13px] font-black">3</span>
                <div>
                  <p className="text-[14px] font-bold">Start a delivery session</p>
                  <p className="text-[12px] text-blue-200 mt-0.5">Log incoming packages and track delivery progress on the map.</p>
                </div>
              </li>
            </ol>
          </motion.div>
        )}

        {/* --- QUICK ACTIONS (2 cards) --- */}
        <motion.div custom={6} variants={cellVariants} initial="initial" animate="animate" className="col-span-1">
          <Link href="/progress" className="block h-full group">
            <div className="relative overflow-hidden rounded-[28px] bg-blue-600 surface-sky p-5 h-full shadow-xl shadow-blue-600/20 transition-all active:scale-90 flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-md mb-3 group-hover:scale-110 transition-transform">
                  <Icon name="package" size={22} strokeWidth={2.5} />
                </div>
                <h2 className="text-[20px] leading-tight font-black text-white tracking-tight">
                  {t("session.title")}
                </h2>
                <p className="text-[12px] font-medium text-blue-200 mt-1 leading-snug">
                  {t("home.live_route_desc")}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div custom={7} variants={cellVariants} initial="initial" animate="animate" className="col-span-1">
          <Link href="/customers/new" className="block h-full group">
            <div className="relative overflow-hidden rounded-[28px] bg-emerald-600 surface-mint p-5 h-full shadow-xl shadow-emerald-600/20 transition-all active:scale-90 flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md mb-3 group-hover:rotate-12 transition-transform">
                  <span className="text-[22px]">➕</span>
                </div>
                <h2 className="text-[20px] leading-tight font-black text-white tracking-tight">
                  {t("customer.add")}
                </h2>
                <p className="text-[12px] font-medium text-emerald-100 mt-1 leading-snug">
                  {t("home.manage_db_desc")}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* --- HOUSE GALLERY (full width) --- */}
        <motion.div custom={7.5} variants={cellVariants} initial="initial" animate="animate" className="col-span-2">
          <Link href="/gallery" className="block group">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 surface-rose p-5 shadow-xl shadow-rose-500/20 transition-all active:scale-90">
              <div className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors duration-500" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-md group-hover:scale-110 transition-transform">
                  <Icon name="image" size={22} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-[20px] leading-tight font-black text-white tracking-tight">
                    {t("nav.gallery")}
                  </h2>
                  <p className="text-[12px] font-medium text-rose-100 mt-1 leading-snug">
                    {t("gallery.subtitle")}
                  </p>
                </div>
                <Icon name="chevron-right" size={20} strokeWidth={3} className="text-white/70 shrink-0" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* --- RECENT VISITS (full width) --- */}
        <motion.div custom={8} variants={cellVariants} initial="initial" animate="animate" className="col-span-2">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("dashboard.recent_visits")}</h2>
          {recentVisits.length > 0 ? (
            <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
              {(showAllVisits ? recentVisits : recentVisits.slice(0, 3)).map((v: any, i: number) => (
                <div key={v.id || i} className="flex items-center gap-3 px-4 py-3 border-b border-card-border last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[14px] font-bold">
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-primary truncate">{v.customerName}</p>
                    <p className="text-[11px] text-secondary">
                      {new Date(v.visited_at || v.visitedAt).toLocaleDateString(dateLocale, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
                      })}
                    </p>
                  </div>
                  {v.notes && (
                    <span className="text-[10px] text-secondary/60 truncate max-w-[80px]">{v.notes}</span>
                  )}
                </div>
              ))}
              {recentVisits.length > 3 && (
                <button
                  onClick={() => setShowAllVisits(!showAllVisits)}
                  className="w-full py-2.5 text-center text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors active:scale-90"
                >
                  {showAllVisits ? t("action.show_less") : t("action.show_more")}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-[24px] bg-card border border-card-border shadow-sm p-5 text-center">
              <p className="text-[13px] font-medium text-secondary">{t("dashboard.no_visits_yet")}</p>
            </div>
          )}
        </motion.div>

        {/* --- SECONDARY LINKS (2 cards) --- */}
        <motion.div custom={9} variants={cellVariants} initial="initial" animate="animate" className="col-span-1">
          <Link href="/customers" className="flex items-center gap-3 rounded-[24px] bg-card surface-sky p-4 shadow-sm border border-card-border hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-100 dark:hover:border-blue-900/50 transition-colors active:scale-90 group h-full">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[18px] group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              👥
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-primary leading-tight">{t("home.manage_db")}</span>
              <span className="block text-[11px] font-medium text-secondary line-clamp-2">{t("home.manage_db_desc")}</span>
            </div>
            <Icon name="chevron-right" size={18} strokeWidth={3} className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 shrink-0" />
          </Link>
        </motion.div>

        <motion.div custom={10} variants={cellVariants} initial="initial" animate="animate" className="col-span-1">
          <Link href="/clusters" className="flex items-center gap-3 rounded-[24px] bg-card surface-rose p-4 shadow-sm border border-card-border hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-100 dark:hover:border-orange-900/50 transition-colors active:scale-90 group h-full">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[18px] group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-primary leading-tight">{t("home.clusters")}</span>
              <span className="block text-[11px] font-medium text-secondary line-clamp-2">{t("home.clusters_desc")}</span>
            </div>
            <Icon name="chevron-right" size={18} strokeWidth={3} className="text-gray-300 dark:text-slate-600 group-hover:text-orange-500 shrink-0" />
          </Link>
        </motion.div>

      </main>
    </div>
  );
}
