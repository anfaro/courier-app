// app/page.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function HomePage() {
  const { data: session } = useSession();
  const { t, locale } = useLanguage();
  const userName = session?.user?.name || "User";

  // Format date based on locale - derived state to avoid extra re-renders
  const dateLocale = locale === "id" ? "id-ID" : "en-GB";
  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

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

        {/* --- QUICK LINKS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.snapshot")}</h2>
          <div className="flex gap-3">

            <Link href="/customers" className="flex-1 rounded-[24px] bg-card p-5 shadow-sm border border-card-border hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all active:scale-90 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">{t("home.manage_db")}</p>
              <p className="text-[18px] leading-none font-black text-primary">👥 {t("nav.customers")}</p>
            </Link>

            <Link href="/map" className="flex-[1.2] rounded-[24px] bg-emerald-50 dark:bg-emerald-950/20 p-5 shadow-sm border border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all active:scale-90 flex flex-col justify-center group">
              <div className="absolute right-0 top-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">{t("home.live_route")}</p>
              <p className="text-[18px] leading-none font-black text-emerald-700 dark:text-emerald-300">🗺️ {t("nav.map")}</p>
            </Link>

          </div>
        </div>

        {/* --- MASSIVE QUICK ACTIONS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.command_center")}</h2>
          <div className="space-y-4">

            {/* MANAGE CUSTOMERS */}
            <Link href="/customers" className="block group">
              <div className="relative overflow-hidden rounded-[32px] bg-[#6B21A8] p-8 shadow-xl shadow-purple-600/20 transition-all active:scale-[0.98]">
                <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] leading-tight font-black text-white mb-2 tracking-tight">
                      {t("home.manage_db")}
                    </h2>
                    <p className="text-purple-200 font-medium text-[14px] leading-snug pr-4">
                      {t("home.manage_db_desc")}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#6B21A8] shadow-md transition-transform duration-500 group-hover:-rotate-12 group-active:scale-90">
                    <span className="text-3xl">👥</span>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* --- SECONDARY LINKS (UPDATED MENU) --- */}
        <div className="pt-2">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">{t("home.field_tools")}</h2>
          <div className="space-y-3">

            {/* Live Map Link */}
            <Link href="/map" className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm border border-card-border hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-colors active:scale-[0.98] group">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">🗺️</div>
                <div>
                  <span className="block text-[15px] font-bold text-primary leading-tight">{t("home.live_route")}</span>
                  <span className="text-[12px] font-medium text-secondary">{t("home.live_route_desc")}</span>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
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
