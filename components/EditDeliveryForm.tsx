"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageInput from "@/components/ImageInput";

export default function EditDeliveryForm({ delivery }: { delivery: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [podUrl, setPodUrl] = useState(delivery.proofOfDeliveryUrl || "");

  const [formData, setFormData] = useState({
    waybillNumber: delivery.waybillNumber || "",
    receiverName: delivery.receiverName || "",
    codAmount: delivery.codAmount?.toString() || "0",
    status: delivery.status || "Pending",
  });

  const statuses = ["Pending", "Delivered", "Failed", "Rescheduled"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, proofOfDeliveryUrl: podUrl }),
      });

      if (!res.ok) throw new Error("Failed to update delivery");

      router.push(`/deliveries/${delivery.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-card-border bg-gray-50 px-5 py-4 text-[15px] font-medium text-gray-800 transition-all focus:border-blue-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-[24px] bg-red-50 p-4 text-[14px] font-bold text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="mb-3 block text-[12px] font-black uppercase tracking-widest text-secondary">
          Delivery Status
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFormData({ ...formData, status })}
              className={`rounded-2xl py-3 text-[13px] font-bold transition-all active:scale-90 border-2 ${formData.status === status
                  ? status === "Delivered" ? "border-green-600 bg-green-50 text-green-700"
                    : status === "Failed" ? "border-red-600 bg-red-50 text-red-700"
                      : "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-transparent bg-gray-100 text-secondary hover:bg-gray-200"
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[13px] font-black uppercase tracking-widest text-secondary">
          Waybill Number
        </label>
        <input
          type="text"
          required
          value={formData.waybillNumber}
          onChange={(e) => setFormData({ ...formData, waybillNumber: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="mb-2 block text-[13px] font-black uppercase tracking-widest text-secondary">
            Receiver Name
          </label>
          <input
            type="text"
            value={formData.receiverName}
            onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
            placeholder="Name of person receiving"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-black uppercase tracking-widest text-secondary">
            COD Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <span className="text-[15px] font-bold text-secondary">Rp</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={formData.codAmount ? Number(formData.codAmount).toLocaleString('id-ID') : ""}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, codAmount: rawValue });
              }}
              className={`${inputClass} pl-12`}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-3xl p-4 border border-card-border">
        <ImageInput
          label="Proof of Delivery / Signature"
          existingImageUrl={podUrl}
          onImageChange={setPodUrl}
          onUploadingChange={setIsImageUploading}
        />
      </div>

      <div className="pt-4 flex gap-3 sticky bottom-4 z-10 bg-card py-2 -mx-2 px-2 rounded-full shadow-lg border border-card-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-full bg-gray-100 py-4 text-[14px] font-bold text-gray-700 active:scale-90 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || isImageUploading}
          className="flex-[2] rounded-full bg-blue-600 py-4 text-[14px] font-black text-white hover:bg-blue-700 active:scale-90 transition-all disabled:bg-blue-300 disabled:shadow-none"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
