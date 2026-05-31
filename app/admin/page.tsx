export const dynamic = "force-dynamic";

import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import AdminQuickActions from "@/components/AdminQuickActions";
import SystemHealth from "@/components/SystemHealth";
import AuditTrailSearch from "@/components/AuditTrailSearch";
import AdminAnalytics from "@/components/AdminAnalytics";
import AdminWipeData from "@/components/AdminWipeData";

export default function AdminHubPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Admin Hub</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">Global command center for fleet and logistics.</p>
        </div>

        <SystemHealth />
        <AdminQuickActions />

        <div className="mb-8">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3 uppercase tracking-widest opacity-60">Logs & Analytics</h2>
          <AdminAnalytics />
        </div>

        <AuditTrailSearch />

        <div className="mb-8">
          <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3 uppercase tracking-widest opacity-60">Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/admin/database" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl">🗄️</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Database Administration</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Backup, restore, maintenance, import/export</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>
            <Link href="/admin/database/settings" className="flex items-center justify-between rounded-[24px] bg-card p-5 shadow-sm border border-card-border active:scale-[0.98] transition-all hover:border-green-200 dark:hover:border-green-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-2xl">🔌</div>
                <div className="flex flex-col">
                  <span className="font-black text-primary leading-tight">Connection Settings</span>
                  <span className="text-[11px] font-medium text-secondary mt-0.5">Configure and hot-reload database connection</span>
                </div>
              </div>
              <span className="text-secondary opacity-30">→</span>
            </Link>
          </div>
        </div>

        <div className="mb-8">
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
          </div>
        </div>

        <AdminWipeData />
      </main>
    </div>
  );
}
