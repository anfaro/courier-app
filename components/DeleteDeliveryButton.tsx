
// components/DeleteDeliveryButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteDeliveryButton({ deliveryId }: { deliveryId: number }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this waybill? This action cannot be undone.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/deliveries");
        router.refresh(); // Force the deliveries list to update
      } else {
        alert("Failed to delete delivery.");
        setIsDeleting(false);
      }
    } catch (error) {
      alert("An error occurred while deleting.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="mt-6 w-full rounded-full bg-red-50 py-4 text-[15px] font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete Waybill"}
    </button>
  );
}
