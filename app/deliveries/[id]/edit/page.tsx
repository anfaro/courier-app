// app/deliveries/[id]/edit/page.tsx

import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import EditDeliveryForm from "@/components/EditDeliveryForm";

export default async function EditDeliveryPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const deliveryId = parseInt(resolvedParams.id);

  const deliveryData = await db.query.deliveries.findFirst({
    where: eq(deliveries.id, deliveryId),
    with: { customer: true }
  });

  if (!deliveryData) return notFound();

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <Breadcrumbs />

      <main className="mx-auto max-w-xl p-4 sm:p-6 mt-2">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Edit Waybill</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">
            Update details for {deliveryData.waybillNumber}
          </p>
        </div>

        <div className="bg-card rounded-[32px] shadow-sm border border-gray-100 p-6 sm:p-8">
          <EditDeliveryForm delivery={deliveryData} />
        </div>
      </main>
    </div>
  );
}
