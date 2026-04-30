// components/WaybillsManager.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageInput from "./ImageInput";
import ImageModal from "./ImageModal"; // Restored original ImageModal

interface Waybill {
  id: number;
  customerId: number | null;
  waybillNumber: string;
  status: string;
  proofOfDeliveryUrl: string | null;
  receiverName: string | null;
  codAmount: string | null;
  createdAt: Date;
}

function getStatusColor(status: string | null) {
  switch (status) {
    case "Delivered": return "bg-green-100 text-green-800 border-green-200";
    case "Failed": return "bg-red-100 text-red-800 border-red-200";
    case "Rescheduled": return "bg-purple-100 text-purple-800 border-purple-200";
    case "Pending":
    default: return "bg-orange-100 text-orange-800 border-orange-200";
  }
}

export default function WaybillsManager({ customerId, customerName, initialDeliveries }: { customerId: number, customerName: string, initialDeliveries: Waybill[] }) {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Waybill[]>(initialDeliveries);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);

  const [statusUpdate, setStatusUpdate] = useState("Delivered");
  const [podPictureDataUrl, setPodPictureDataUrl] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const openModal = (waybill: Waybill) => {
    setSelectedWaybill(waybill);
    setStatusUpdate(waybill.status);
    setPodPictureDataUrl(waybill.proofOfDeliveryUrl);
    setReceiverName(waybill.receiverName || "");
    setError("");
  };

  const closeModal = () => {
    setSelectedWaybill(null);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWaybill) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/deliveries/${selectedWaybill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusUpdate,
          proofOfDeliveryDataUrl: podPictureDataUrl,
          receiverName: statusUpdate === "Delivered" ? receiverName : "",
        }),
      });

      if (res.ok) {
        setDeliveries(prev => prev.map(d => d.id === selectedWaybill.id ? {
          ...d,
          status: statusUpdate,
          proofOfDeliveryUrl: podPictureDataUrl,
          receiverName: statusUpdate === "Delivered" ? receiverName : ""
        } : d));
        closeModal();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update waybill");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <hr className="my-8 border-dashed border-gray-200" />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Waybills</h2>
        <Link
          href={`/customers/${customerId}/new-waybill?name=${encodeURIComponent(customerName)}`}
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
        >
          + Add Waybill
        </Link>
      </div>

      {deliveries.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-gray-50 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-gray-500">No waybills recorded yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className="flex items-center gap-4 rounded-[1.5rem] border border-gray-50 bg-white p-4 shadow-sm">

              {/* Image Container - Using your original ImageModal safely! */}
              <div className="shrink-0">
                {delivery.proofOfDeliveryUrl ? (
                  <ImageModal
                    src={delivery.proofOfDeliveryUrl}
                    alt="Proof"
                    thumbnailClassName="h-16 w-16 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-2xl">
                    📦
                  </div>
                )}
              </div>

              {/* Waybill Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-[16px] font-extrabold text-gray-900">
                    {delivery.waybillNumber}
                  </h4>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${getStatusColor(delivery.status)}`}>
                    {delivery.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    📅 {new Date(delivery.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {delivery.receiverName && (
                    <span className="flex items-center gap-1 truncate">
                      👤 Rec: {delivery.receiverName}
                    </span>
                  )}
                </div>

                {Number(delivery.codAmount) > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700">
                    💰 COD: Rp {Number(delivery.codAmount).toLocaleString("id-ID")}
                  </div>
                )}
              </div>

              {/* NEW: Dedicated Edit Button */}
              <button
                onClick={() => openModal(delivery)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Update Status"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom Sheet Modal remains the same */}
      {selectedWaybill && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-xl rounded-t-[2.5rem] border-t border-gray-100 bg-white p-6 pb-8 shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400">Waybill Update</p>
                <h3 className="text-xl font-extrabold tracking-tight text-gray-900">{selectedWaybill.waybillNumber}</h3>
              </div>
              <button onClick={closeModal} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
            </div>

            {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-medium text-red-700">{error}</p>}

            <form onSubmit={handleSubmitUpdate} className="space-y-6">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-gray-700">Set New Status</label>
                <div className="relative">
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-transparent bg-gray-100 py-4 pl-5 pr-12 text-[16px] font-semibold text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10"
                  >
                    <option value="Pending">🍊 Pending</option>
                    <option value="Delivered">✅ Delivered</option>
                    <option value="Failed">❌ Failed</option>
                    <option value="Rescheduled">🟣 Rescheduled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-gray-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                {console.log(selectedWaybill.proofOfDeliveryUrl)}
                <ImageInput
                  label="Proof of Delivery Photo (Optional)"
                  existingImageUrl={selectedWaybill.proofOfDeliveryUrl}
                  onImageChange={setPodPictureDataUrl}
                  inputType="delivery"
                />
              </div>

              {statusUpdate === "Delivered" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Receiver Name</label>
                  <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required placeholder="e.g., Jane Doe (neighbor)" className="w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-4 text-[16px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10" />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-full bg-blue-600 p-4 text-[16px] font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:bg-blue-300"
              >
                {isLoading ? "Saving..." : "Update Waybill"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

