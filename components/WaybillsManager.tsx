
"use client";

import Link from "next/link";

function getStatusColor(status: string | null) {
  switch (status) {
    case "Delivered":
      return "bg-green-100 text-green-800";
    case "Failed":
      return "bg-red-100 text-red-800";
    case "Pending":
    default:
      return "bg-orange-100 text-orange-800";
  }
}

export default function WaybillsManager({
  customerId,
  customerName,
  initialDeliveries
}: {
  customerId: string,
  customerName: string,
  initialDeliveries: any[]
}) {
  return (
    <div className="mt-8 space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-extrabold text-primary">Waybills ({initialDeliveries.length})</h2>
        <Link
          href={`/deliveries/new?customerId=${customerId}`}
          className="rounded-full bg-blue-100 px-4 py-2 text-[13px] font-bold text-blue-700 transition-transform active:scale-90"
        >
          + Add New
        </Link>
      </div>

      {initialDeliveries.length === 0 ? (
        <div className="rounded-[32px] border border-card-border bg-card py-12 text-center shadow-sm">
          <span className="text-5xl">📦</span>
          <p className="mt-4 text-[16px] font-bold text-primary">No waybills yet</p>
          <p className="mt-1 text-[14px] font-medium text-secondary">Click "+ Add New" to create one.</p>
        </div>
      ) : (
        /* Simple Clickable Cards Grid */
        <div className="grid gap-3 sm:grid-cols-2">
          {initialDeliveries.map((delivery) => (
            <Link
              key={delivery.id}
              href={`/deliveries/${delivery.id}`}
              className="block rounded-[28px] border border-card-border bg-card p-5 shadow-sm transition-all hover:border-blue-300 active:scale-[0.98]"
            >
              <div className="mb-2 flex items-start justify-between">
                <p className="text-[17px] font-black text-primary">{delivery.waybillNumber}</p>
                <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusColor(delivery.status)}`}>
                  {delivery.status}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-card-border pt-3">
                <p className="text-[12px] font-bold text-gray-400">
                  {new Date(delivery.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <p className={`text-[15px] font-black ${delivery.codAmount > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {delivery.codAmount > 0 ? `Rp ${delivery.codAmount.toLocaleString('id-ID')}` : "NON-COD"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

