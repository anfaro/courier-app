
// app/deliveries/[id]/page.tsx
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";
import DeleteDeliveryButton from "@/components/DeleteDeliveryButton";

// Helper for dynamic colors
function getStatusTheme(status: string | null) {
  switch (status) {
    case "Delivered":
      return { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", pillBg: "bg-white" };
    case "Failed":
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", pillBg: "bg-white" };
    case "Pending":
    default:
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", pillBg: "bg-white" };
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
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-md p-4 sm:p-6 mt-2">

        {/* --- MAIN RECEIPT CARD --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden relative flex flex-col">

          {/* 1. Dynamic Status Banner */}
          <div className={`px-6 py-5 flex items-center justify-between border-b ${theme.border} ${theme.bg}`}>
            <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${theme.pillBg} ${theme.text}`}>
              • {deliveryData.status}
            </span>
            <span className={`text-[12px] font-bold opacity-80 ${theme.text}`}>
              {new Date(deliveryData.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          <div className="p-6 sm:p-8">

            {/* 2. Waybill Number & Edit Button */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Waybill Number</p>
                <h1 className="text-[28px] sm:text-[32px] leading-none font-black text-gray-900 tracking-tight break-all">
                  {deliveryData.waybillNumber}
                </h1>
              </div>

              <Link
                href={`/deliveries/${deliveryData.id}/edit`}
                className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-blue-600 transition-all hover:bg-blue-50 active:scale-95 border border-gray-100"
                title="Edit Delivery"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Link>
            </div>

            {/* 3. People Grid (Customer & Receiver) */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-gray-50 rounded-[20px] p-4 border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Customer</p>
                <p className="text-[14px] font-bold text-gray-900 truncate">
                  {deliveryData.customer?.name || deliveryData.customerName || "Unknown"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-[20px] p-4 border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Receiver</p>
                <p className="text-[14px] font-bold text-gray-900 truncate">
                  {deliveryData.receiverName || "-"}
                </p>
              </div>
            </div>

            {/* 4. Proof of Delivery Area */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Proof of Delivery</p>
              <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative">
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
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">No Image</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 5. Tear-off Ticket / Financial Block */}
          {/* A dashed top border makes it look like a detachable receipt */}
          <div className={`p-6 sm:p-8 border-t-2 border-dashed ${isCOD ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isCOD ? 'text-red-400' : 'text-blue-400'}`}>
                  {isCOD ? "Cash to Collect" : "Payment Status"}
                </p>
                <p className={`text-[36px] sm:text-[42px] leading-none font-black tracking-tighter ${isCOD ? 'text-red-600' : 'text-blue-600'}`}>
                  {isCOD ? `Rp ${deliveryData.codAmount.toLocaleString('id-ID')}` : "NON-COD"}
                </p>
              </div>
              <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-sm ${isCOD ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}>
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

