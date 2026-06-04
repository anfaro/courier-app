// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function HomePage() {
  const { data: session } = useSession();
  const { t, locale } = useLanguage();
  const userName = session?.user?.name || "User";

  const [stats, setStats] = useState({ totalCustomers: 0, totalClusters: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [showAllVisits, setShowAllVisits] = useState(false);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";
  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [custRes, clustRes, nameRes] = await Promise.all([
          fetch("/api/customers?limit=1&offset=0"),
          fetch("/api/clusters?limit=1&offset=0"),
          fetch("/api/customers?limit=200&offset=0"),
        ]);
        if (custRes.ok) {
          const custData = await custRes.json();
          setStats(prev => ({ ...prev, totalCustomers: custData.total ?? custData.customers?.length ?? 0 }));
        }
        if (clustRes.ok) {
          const clustData = await clustRes.json();
          setStats(prev => ({ ...prev, totalClusters: clustData.total ?? clustData.clusters?.length ?? 0 }));
        }
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          const allCustomers = nameData.customers || [];
          const visitRes = await fetch("/api/visits");
          if (visitRes.ok) {
            const { visits: visitList } = await visitRes.json();
            if (visitList && visitList.length > 0) {
              const customerMap = new Map(allCustomers.map((c: any) => [c.id, c.name]));
              const enriched = (visitList as any[])
                .sort((a, b) => new Date(b.visited_at || b.visitedAt).getTime() - new Date(a.visited_at || a.visitedAt).getTime())
                .slice(0, 5)
                .map((v: any) => ({ ...v, customerName: customerMap.get(v.customer_id || v.customerId) || "Unknown" }));
              setRecentVisits(enriched);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch home stats", err);
      } finally {
        setStatsLoaded(true);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-xl p-4 sm:p-6 space-y-8 mt-2">

        {/* --- WELCOME BANNER --- */}
        <div>
          <p className="text-[13px] font-black uppercase tracking-widest text-secondary mb-1">
            {today}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">
            {t("home.good_morning")}<br />
            <span className="text-blue-600 dark:text-blue-400">{userName}</span>
          </h1>
        </div>

        {/* --- SNAPSHOT STATS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.snapshot")}</h2>
          <div className="flex gap-3">

            <Link href="/customers" className="flex-1 rounded-[24px] bg-card p-5 shadow-sm border border-card-border hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all active:scale-90 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">{t("home.total_customers")}</p>
              <p className="text-[28px] leading-none font-black text-primary">{stats.totalCustomers}</p>
            </Link>

            <Link href="/clusters" className="flex-1 rounded-[24px] bg-orange-50 dark:bg-orange-950/20 p-5 shadow-sm border border-orange-100 dark:border-orange-900/50 hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-md transition-all active:scale-90 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 dark:text-orange-500 mb-1">{t("home.total_clusters")}</p>
              <p className="text-[28px] leading-none font-black text-primary">{stats.totalClusters}</p>
            </Link>

          </div>
        </div>

        {/* --- GET STARTED (empty state) --- */}
        {statsLoaded && stats.totalCustomers === 0 && (
          <div className="rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 shadow-xl shadow-blue-600/20 text-white">
            <h2 className="text-[22px] font-black tracking-tight mb-3">🚀 Get Started</h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-black">1</span>
                <div>
                  <p className="text-[16px] font-bold">Add your first customer</p>
                  <p className="text-[13px] text-blue-200 mt-0.5">Tap the big blue button below to create a customer with name, address, and location.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-black">2</span>
                <div>
                  <p className="text-[16px] font-bold">Organize with clusters</p>
                  <p className="text-[13px] text-blue-200 mt-0.5">Group customers into clusters (areas, routes) for better organization.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-black">3</span>
                <div>
                    <p className="text-[16px] font-bold">Start a delivery session</p>
                    <p className="text-[13px] text-blue-200 mt-0.5">Create a new session, log incoming packages, and track delivery progress on the map.</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* --- QUICK ACTIONS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.command_center")}</h2>
          <div className="space-y-4">

            {/* ACTION 1: CUSTOMERS DATABASE */}
            <Link href="/customers/new" className="block group">
              <div className="relative overflow-hidden rounded-[32px] bg-[#0A2FFF] p-8 shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
                <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] leading-tight font-black text-white mb-2 tracking-tight">
                      {t("customer.add")}
                    </h2>
                    <p className="text-blue-200 font-medium text-[14px] leading-snug pr-4">
                      {t("home.manage_db_desc")}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#0A2FFF] shadow-md transition-transform duration-500 group-hover:rotate-12 group-active:scale-90">
                    <span className="text-3xl">➕</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* ACTION 2: PROGRESS */}
            <Link href="/progress" className="block group">
              <div className="relative overflow-hidden rounded-[32px] bg-[#059669] p-8 shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98]">
                <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] leading-tight font-black text-white mb-2 tracking-tight">
                      {t("session.title")}
                    </h2>
                    <p className="text-emerald-200 font-medium text-[14px] leading-snug pr-4">
                      {t("home.live_route_desc")}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#059669] shadow-md transition-transform duration-500 group-hover:-rotate-12 group-active:scale-90">
                    <span className="text-3xl">📋</span>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* --- RECENT VISITS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("dashboard.recent_visits")}</h2>
          {recentVisits.length > 0 ? (
            <div className="rounded-[20px] bg-card border border-card-border shadow-sm overflow-hidden">
              {(showAllVisits ? recentVisits : recentVisits.slice(0, 3)).map((v: any, i: number) => (
                <div key={v.id || i} className="flex items-center gap-3 px-4 py-3 border-b border-card-border last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
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
            <div className="rounded-[20px] bg-card border border-card-border shadow-sm p-5 text-center">
              <p className="text-[13px] font-medium text-secondary">{t("dashboard.no_visits_yet")}</p>
            </div>
          )}
        </div>

        {/* --- SECONDARY LINKS --- */}
        <div className="pt-2">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.field_tools")}</h2>
          <div className="space-y-3">

            {/* Customers Link */}
            <Link href="/customers" className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm border border-card-border hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-100 dark:hover:border-blue-900/50 transition-colors active:scale-[0.98] group">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">👥</div>
                <div>
                  <span className="block text-[15px] font-bold text-primary leading-tight">{t("home.manage_db")}</span>
                  <span className="text-[12px] font-medium text-secondary">{t("home.manage_db_desc")}</span>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </Link>

            {/* Clusters Link */}
            <Link href="/clusters" className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm border border-card-border hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-100 dark:hover:border-orange-900/50 transition-colors active:scale-[0.98] group">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">📍</div>
                <div>
                  <span className="block text-[15px] font-bold text-primary leading-tight">{t("home.clusters")}</span>
                  <span className="text-[12px] font-medium text-secondary">{t("home.clusters_desc")}</span>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300 dark:text-slate-600 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </Link>

          </div>
        </div>

      </main>
    </div>
  );
}
