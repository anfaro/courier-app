// app/admin/page.tsx
import { db } from "@/lib/db";
import { users, deliveries, customers } from "@/lib/schema";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function AdminDashboardPage() {
  // 1. Fetch system-wide analytics
  const allUsers = await db.select().from(users);
  const allDeliveries = await db.select().from(deliveries);
  const allCustomers = await db.select().from(customers);

  const pendingDeliveries = allDeliveries.filter(d => d.status === "Pending");
  const totalCodPending = pendingDeliveries.reduce((sum, d) => sum + (d.codAmount || 0), 0);
  const superadmins = allUsers.filter(u => u.role === "superadmin").length;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] overflow-hidden">
      {/* Fixed Header & Breadcrumbs */}
      <div className="shrink-0 z-30 bg-[#F8F9FA]">
        <Header />
        <Breadcrumbs />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Admin Hub</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">System analytics and fleet management.</p>
        </div>

        {/* --- SYSTEM ANALYTICS --- */}
        <div className="px-4 sm:px-6 mb-8">
          <h2 className="text-[14px] font-bold tracking-tight text-gray-900 mb-3">System Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-500 mb-1">Total Users</p>
              <p className="text-[28px] leading-none font-black text-gray-900">{allUsers.length}</p>
              <p className="text-[11px] font-medium text-gray-400 mt-1">{superadmins} Superadmin(s)</p>
            </div>

            <div className="rounded-[24px] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-1">Customers</p>
              <p className="text-[28px] leading-none font-black text-gray-900">{allCustomers.length}</p>
              <p className="text-[11px] font-medium text-gray-400 mt-1">In Database</p>
            </div>

            <div className="col-span-2 rounded-[24px] bg-orange-50 p-5 shadow-sm border border-orange-100 flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-1">Total Floating COD</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[14px] font-bold text-orange-600">Rp</span>
                <span className="text-[28px] leading-none font-black text-orange-700 tracking-tight">
                  {totalCodPending.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-[11px] font-medium text-orange-500/80 mt-1">Across {pendingDeliveries.length} active waybills</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 mb-8">
          <h2 className="text-[14px] font-bold tracking-tight text-gray-900 mb-3">Database Tools</h2>
          <div className="grid grid-cols-1 gap-3">
            <Link href="/admin/customers" className="flex items-center justify-between rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">👥</div>
                <span className="font-bold text-gray-900">Manage Customers</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/deliveries" className="flex items-center justify-between rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">📦</div>
                <span className="font-bold text-gray-900">Manage Waybills</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/clusters" className="flex items-center justify-between rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">📍</div>
                <span className="font-bold text-gray-900">Manage Clusters</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>

        {/* --- USER MANAGEMENT --- */}
        <div className="px-4 sm:px-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold tracking-tight text-gray-900">Fleet Management</h2>
            <button className="text-[12px] font-bold text-blue-600 active:scale-95 transition-transform">
              + Add User
            </button>
          </div>

          <div className="space-y-3">
            {allUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-[24px] bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-[14px] ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 leading-tight">{user.name}</p>
                    <p className="text-[12px] font-medium text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'
                    }`}>
                    {user.role}
                  </span>

                  {/* Action Dropdown/Buttons will go here */}
                  <button className="text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors">
                    Manage Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
