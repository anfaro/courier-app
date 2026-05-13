// app/admin/page.tsx
import { db } from "@/lib/db";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import AdminAnalytics from "@/components/AdminAnalytics";
import AdminWipeData from "@/components/AdminWipeData";
import AdminQuickActions from "@/components/AdminQuickActions";

export default async function AdminHubPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Fixed Header & Breadcrumbs */}
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Admin Hub</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Global command center for fleet and logistics.</p>
        </div>

        {/* --- QUICK ACTIONS --- */}
        <AdminQuickActions />

        {/* --- SYSTEM ANALYTICS --- */}
        <AdminAnalytics />

        {/* --- MANAGEMENT ACTIONS --- */}
        <div className="px-4 sm:px-6 mb-8">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3 uppercase tracking-widest opacity-60">System Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/admin/users" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-purple-200 dark:hover:border-purple-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-2xl">👥</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Fleet Management</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Onboard, promote, or offboard couriers</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>

            <Link href="/admin/customers" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl">🏠</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Customer Database</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Manage contacts and pinned locations</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>

            <Link href="/admin/deliveries" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-emerald-200 dark:hover:border-emerald-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl">📦</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Waybill Lifecycle</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Audit PODs and delivery history</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>

            <Link href="/admin/clusters" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-amber-200 dark:hover:border-amber-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl">📍</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Zone Intelligence</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Manage neighborhood clusters and regions</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>
          </div>
        </div>

        {/* --- DANGER ZONE --- */}
        <AdminWipeData />
      </main>
    </div>
  );
}
