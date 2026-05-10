// app/admin/deliveries/page.tsx
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdminDeliveryTable from "@/components/AdminDeliveryTable";

export default async function AdminDeliveriesPage() {
  const allDeliveries = await db.select().from(deliveries);

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background">
        <Breadcrumbs />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Waybill Management</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">Bulk manage and clean up delivery records.</p>
        </div>
        <AdminDeliveryTable initialDeliveries={allDeliveries} />
      </main>
    </div>
  );
}
