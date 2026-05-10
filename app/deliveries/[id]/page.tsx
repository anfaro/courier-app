// app/deliveries/[id]/page.tsx
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";
import DeleteDeliveryButton from "@/components/DeleteDeliveryButton";

// Helper for dynamic colors
function getStatusTheme(status: string | null) {
  switch (status) {
    case "Delivered":
      return { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", border: "border-green-100 dark:border-green-900/50", pillBg: "bg-card" };
    case "Failed":
      return { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", border: "border-red-100 dark:border-red-900/50", pillBg: "bg-card" };
    case "Pending":
    default:
      return { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-100 dark:border-orange-900/50", pillBg: "bg-card" };
  }
}

export default async function DeliveryDetailsPage({
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

  const isCOD = deliveryData.codAmount > 0;
  const theme = getStatusTheme(deliveryData.status);

  return (
    <div className="min-h-screen bg-background pb-24">
      
      <Breadcrumbs />

      <main className="mx-auto max-w-md p-4 sm:p-6 mt-2">

        {/* --- MAIN RECEIPT CARD --- */}
        <div className="bg-card rounded-[32px] shadow-sm border border-card-border overflow-hidden relative flex flex-col">

          {/* 1. Dynamic Status Banner */}
          <div className={`px-6 py-5 flex items-center justify-between border-b ${theme.border} ${theme.bg}`}>
            <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${theme.pillBg} ${theme.text}`}>
              • {deliveryData.status}
            </span>
            <span className={`text-[12px] font-bold opacity-80 ${theme.text}`}>
              {new Date(deliveryData.createdAt).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          <div className="p-6 sm:p-8">

            {/* 2. Waybill Number & Edit Button */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1">Waybill Number</p>
                <h1 className="text-[28px] sm:text-[32px] leading-none font-black text-primary tracking-tight break-all">
                  {deliveryData.waybillNumber}
                </h1>
              </div>

              <Link
                href={`/deliveries/${deliveryData.id}/edit`}
                className="btn-outline !h-12 !w-12 !p-0 shrink-0"
                title="Edit Delivery"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Link>
            </div>

            {/* 3. People Grid (Customer & Receiver) */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-background rounded-[20px] p-4 border border-card-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Customer</p>
                <p className="text-[14px] font-bold text-primary truncate">
                  {deliveryData.customer?.name || deliveryData.customerName || "Unknown"}
                </p>
              </div>
              <div className="bg-background rounded-[20px] p-4 border border-card-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Receiver</p>
                <p className="text-[14px] font-bold text-primary truncate">
                  {deliveryData.receiverName || "-"}
                </p>
              </div>
            </div>

            {/* 4. Proof of Delivery Area */}
            <div className="mb-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary mb-3 ml-1">Proof of Delivery</p>
              <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-background border-2 border-dashed border-card-border flex items-center justify-center relative">
                {deliveryData.proofOfDeliveryUrl ? (
                  <div className="absolute inset-0">
                    <ImageModal
                      src={deliveryData.proofOfDeliveryUrl}
                      alt="POD"
                      thumbnailClassName="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-[48px] block mb-2 opacity-50">📷</span>
                    <span className="text-[12px] font-bold text-secondary uppercase tracking-widest">No Image</span>
                  </div>
                )}
              </div>
            </div>

            {/* --- RECORD TIMELINE --- */}
            <div className="space-y-4">
               <p className="text-[11px] font-black uppercase tracking-widest text-secondary ml-1">Record History</p>
               <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-card-border">
                  {/* Created At */}
                  <div className="relative">
                    <div className="absolute -left-[19px] top-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-card ring-4 ring-blue-500/10" />
                    <div>
                      <p className="text-[13px] font-black text-primary">Waybill Created</p>
                      <p className="text-[11px] font-medium text-secondary">
                        {new Date(deliveryData.createdAt).toLocaleString('id-ID', {
                           day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  {/* Updated At */}
                  <div className="relative">
                    <div className="absolute -left-[19px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card ring-4 ring-emerald-500/10" />
                    <div>
                      <p className="text-[13px] font-black text-primary">Last Activity / Status Update</p>
                      <p className="text-[11px] font-medium text-secondary">
                        {new Date(deliveryData.updatedAt).toLocaleString('id-ID', {
                           day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

          </div>

          {/* 5. Tear-off Ticket / Financial Block */}
          <div className={`p-6 sm:p-8 border-t-2 border-dashed ${isCOD ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50'}`}>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isCOD ? 'text-red-400 dark:text-red-500' : 'text-blue-400 dark:text-blue-500'}`}>
                  {isCOD ? "Cash to Collect" : "Payment Status"}
                </p>
                <p className={`text-[36px] sm:text-[42px] leading-none font-black tracking-tighter ${isCOD ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {isCOD ? `Rp ${deliveryData.codAmount.toLocaleString('id-ID')}` : "NON-COD"}
                </p>
              </div>
              <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-sm ${isCOD ? 'bg-card text-red-500' : 'bg-card text-blue-500'}`}>
                {isCOD ? "💵" : "💳"}
              </div>
            </div>
          </div>
        </div>

        <DeleteDeliveryButton deliveryId={deliveryData.id} />
      </main>
    </div>
  );
}
