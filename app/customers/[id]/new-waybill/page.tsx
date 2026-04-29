// app/customers/[id]/new-waybill/page.tsx
"use client";

import { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ImageInput from "@/components/ImageInput";

export default function NewWaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const searchParams = useSearchParams();
  const defaultName = searchParams.get("name") || "";

  const [waybillNumber, setWaybillNumber] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [receiverName, setReceiverName] = useState(defaultName);
  const [imageFile, setImageFile] = useState<string | null>(null);

  // NEW: Add a state for the delivery status
  const [status, setStatus] = useState("Pending");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setCodAmount(rawValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      /**
      let finalImageUrl = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("type", "delivery");

        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Failed to upload proof of delivery.");
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }
      **/

      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(customerId),
          waybillNumber,
          codAmount: codAmount ? parseInt(codAmount) : 0,
          receiverName,
          proofOfDeliveryUrl: imageFile,
          status, // NEW: Send the status to the backend
        }),
      });

      if (res.ok) {
        router.push(`/customers/${customerId}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to add waybill");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 px-5 py-3.5 text-[15px] text-gray-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Header />
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] bg-white p-6 sm:p-10 shadow-sm border border-gray-50">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Add Waybill</h1>
            <p className="mt-2 text-base text-gray-500">Record a new delivery for this customer.</p>
          </div>

          {error && <p className="mb-6 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Waybill / Tracking Number</label>
              <input type="text" value={waybillNumber} onChange={(e) => setWaybillNumber(e.target.value)} required className={inputClass} placeholder="e.g., JD0123456789" />
            </div>

            {/* NEW: Status Dropdown Menu */}
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Delivery Status</label>
              {/* Note: The select tag looks great with our M3 inputClass! */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="Pending">Pending</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed / Attempted</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">Receiver Name</label>
              <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required className={inputClass} />
            </div>

            <div className="rounded-[2rem] bg-red-50/50 p-6 border border-red-100">
              <label className="mb-2 block text-[15px] font-bold text-red-900">Total COD Amount (Rp)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-5 font-bold text-gray-500">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={codAmount ? parseInt(codAmount).toLocaleString("id-ID") : ""}
                  onChange={handleCodChange}
                  className="w-full rounded-2xl border-none bg-white py-4 pl-12 pr-5 text-lg font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-red-500"
                  placeholder="0"
                />
              </div>
              <p className="mt-2 text-xs text-red-700/70">Leave as 0 if the package is already paid for.</p>
            </div>

            <div>
              <ImageInput label="Proof of Delivery (Optional)" onImageChange={setImageFile} />
              {/**
              <label className="mb-2 block text-[15px] font-semibold text-gray-700">
                Proof of Delivery Image <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input type="file" accept="image/*" onChange={(e) => { if (e.target.files) setImageFile(e.target.files[0]); }} className="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-100 file:px-6 file:py-2.5 file:text-[15px] file:font-semibold file:text-blue-700 hover:file:bg-blue-200 transition" />
              **/}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button type="submit" disabled={isLoading} className="flex-1 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:bg-blue-400 sm:flex-none">
                {isLoading ? "Saving..." : "Save Waybill"}
              </button>
              <button type="button" onClick={() => router.back()} className="flex-1 rounded-full bg-gray-100 px-8 py-4 text-[15px] font-bold text-gray-700 transition hover:bg-gray-200 sm:flex-none">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

