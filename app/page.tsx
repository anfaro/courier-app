// app/page.tsx

import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Header from "@/components/header";
import Link from "next/link";

export default async function HomePage() {
  // 1. Attempt to get the user session (Fallback to Nobleman001 if session isn't explicitly passed)
  const session = await getServerSession();
  const userName = session?.user?.name || "Nobleman001";

  // 2. Fetch Daily Stats from Drizzle
  const pendingDeliveries = await db.query.deliveries.findMany({
    where: eq(deliveries.status, "Pending"),
  });

  const pendingCount = pendingDeliveries.length;
  const totalCodPending = pendingDeliveries.reduce((sum, d) => sum + (d.codAmount || 0), 0);

  // 3. Format today's date for the header
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />

      <main className="mx-auto max-w-xl p-4 sm:p-6 space-y-8 mt-2">

        {/* --- WELCOME BANNER --- */}
        <div>
          <p className="text-[13px] font-black uppercase tracking-widest text-gray-400 mb-1">
            {today}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Good morning,<br />
            <span className="text-blue-600">{userName}</span>
          </h1>
        </div>

        {/* --- DAILY SNAPSHOT (Clickable Stats) --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-gray-900 mb-3">Daily Snapshot</h2>
          <div className="flex gap-3">

            <Link href="/deliveries?filter=Pending" className="flex-1 rounded-[24px] bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-95 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Pending Waybills</p>
              <p className="text-[28px] leading-none font-black text-gray-900">{pendingCount}</p>
            </Link>

            <div className="flex-[1.2] rounded-[24px] bg-orange-50 p-5 shadow-sm border border-orange-100 flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-1">To Collect (COD)</p>
              <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="text-[14px] font-bold text-orange-600">Rp</span>
                <span className="text-[24px] leading-none font-black text-orange-700 tracking-tight">
                  {totalCodPending.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* --- MASSIVE QUICK ACTIONS --- */}
        <div>
          <h2 className="text-[14px] font-bold tracking-tight text-gray-900 mb-3">Command Center</h2>
          <div className="space-y-4">

            {/* ACTION 1: GLOBAL ENTRY HUB */}
            <Link href="/deliveries/new" className="block group">
              <div className="relative overflow-hidden rounded-[32px] bg-[#0A2FFF] p-8 shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
                <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] leading-tight font-black text-white mb-2 tracking-tight">
                      Global Entry Hub
                    </h2>
                    <p className="text-blue-200 font-medium text-[14px] leading-snug pr-4">
                      Paste Excel data or scan barcodes instantly.
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#0A2FFF] shadow-md transition-transform duration-500 group-hover:rotate-12 group-active:scale-90">
                    <span className="text-3xl">📦</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* ACTION 2: MANAGE CUSTOMERS */}
            <Link href="/customers" className="block group">
              <div className="relative overflow-hidden rounded-[32px] bg-[#6B21A8] p-8 shadow-xl shadow-purple-600/20 transition-all active:scale-[0.98]">
                <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] leading-tight font-black text-white mb-2 tracking-tight">
                      Manage Database
                    </h2>
                    <p className="text-purple-200 font-medium text-[14px] leading-snug pr-4">
                      View customers, pinned GPS locations, and delivery notes.
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
          <h2 className="text-[14px] font-bold tracking-tight text-gray-900 mb-3">Field Tools</h2>
          <div className="space-y-3">

            {/* Live Map Link */}
            <Link href="/map" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:bg-emerald-50 hover:border-emerald-100 transition-colors active:scale-[0.98] group">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xl group-hover:bg-emerald-100 transition-colors">🗺️</div>
                <div>
                  <span className="block text-[15px] font-bold text-gray-900 leading-tight">Live Route Map</span>
                  <span className="text-[12px] font-medium text-gray-500">View GPS density of pending orders</span>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </Link>

            {/* Clusters Link */}
            <Link href="/clusters" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:bg-orange-50 hover:border-orange-100 transition-colors active:scale-[0.98] group">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600 text-xl group-hover:bg-orange-100 transition-colors">📍</div>
                <div>
                  <span className="block text-[15px] font-bold text-gray-900 leading-tight">Neighborhood Clusters</span>
                  <span className="text-[12px] font-medium text-gray-500">Manage delivery zones and regions</span>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </Link>

          </div>
        </div>

      </main>
    </div>
  );
}

