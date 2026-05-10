// components/DeleteDeliveryButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirmation } from "./ConfirmationProvider";
import { useLanguage } from "./LanguageProvider";

export default function DeleteDeliveryButton({ deliveryId }: { deliveryId: number }) {
  const { askConfirmation } = useConfirmation();
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = await askConfirmation({
      title: `${t("action.delete")} ${t("search.waybills")}?`,
      message: "Are you sure you want to delete this waybill? This action cannot be undone.",
      confirmText: t("action.delete"),
      type: "danger"
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/deliveries");
        router.refresh(); 
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
      className="mt-6 w-full rounded-full bg-red-50 py-4 text-[15px] font-bold text-red-600 transition-all hover:bg-red-100 active:scale-90 disabled:opacity-50"
    >
      {isDeleting ? t("action.loading") : `${t("action.delete")} ${t("search.waybills")}`}
    </button>
  );
}
