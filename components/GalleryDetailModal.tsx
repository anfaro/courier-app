// components/GalleryDetailModal.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import { useConfirmation } from "./ConfirmationProvider";
import { useToast } from "./ToastProvider";
import { useScrollLock } from "@/lib/useScrollLock";
import GalleryImage from "./GalleryImage";
import Icon from "@/components/Icon";

interface GalleryCustomer {
  id: string;
  name: string;
  phoneNumber: string | null;
  housePictures: string[];
  photoCount: number;
}

interface FullDetail {
  phoneNumber: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  landmark: string | null;
  notes: string | null;
}

export default function GalleryDetailModal({
  customer,
  onClose,
}: {
  customer: GalleryCustomer | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { askConfirmation } = useConfirmation();
  const { showToast } = useToast();
  useScrollLock(customer !== null);

  const [detail, setDetail] = useState<FullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) {
      setDetail(null);
      setDetailLoading(false);
      setPhotos([]);
      return;
    }
    setPhotos(customer.housePictures);
    let cancelled = false;
    const customerId = customer.id;
    setDetailLoading(true);
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDetail({
            phoneNumber: data.phoneNumber ?? null,
            address: data.address ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            landmark: data.landmark ?? null,
            notes: data.notes ?? null,
          });
        }
      } catch {
        // keep list-level data only
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    fetchDetail();
    return () => { cancelled = true; };
  }, [customer]);

  async function handleDeleteImage(imageUrl: string) {
    const confirmed = await askConfirmation({
      title: t("gallery.delete_confirm_title"),
      message: t("gallery.delete_confirm_msg"),
      type: "danger",
      confirmText: t("action.delete"),
    });
    if (!confirmed) return;

    setDeleting(imageUrl);
    try {
      const res = await fetch("/api/gallery/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer!.id, imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos);
        showToast(t("gallery.image_deleted"), "success");
        if (data.photos.length === 0) {
          onClose();
        }
      } else {
        showToast("Failed to delete image", "error");
      }
    } catch {
      showToast("Failed to delete image", "error");
    } finally {
      setDeleting(null);
    }
  }

  const phone = detail?.phoneNumber ?? customer?.phoneNumber ?? null;
  const phoneDigits = phone?.replace(/\D/g, "");
  const waLink = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
  const navLink = detail?.latitude && detail?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`
    : null;

  return (
    <AnimatePresence>
      {customer && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Floating card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex w-full max-w-sm max-h-[85vh] flex-col overflow-hidden rounded-[32px] border border-card-border bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={customer.name}
          >
            {/* Close + Delete buttons */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              {photos.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleDeleteImage(photos[0])}
                  disabled={deleting !== null}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-90 disabled:opacity-50"
                  aria-label={t("gallery.delete_image")}
                >
                  {deleting !== null ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Icon name="trash" size={16} strokeWidth={2.5} />
                  )}
                </motion.button>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white active:scale-90"
              >
                <Icon name="close" size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Media — scrollable image gallery */}
            <div className="shrink-0 overflow-y-auto no-scrollbar bg-black">
              {photos.length === 1 ? (
                <div className="relative aspect-[4/3] w-full">
                  <GalleryImage srcs={photos} alt={customer.name} />
                </div>
              ) : (
                <div className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar">
                  {photos.map((url, i) => (
                    <div key={url} className="relative shrink-0 w-full snap-center">
                      <div className="relative aspect-[4/3] w-full">
                        <GalleryImage srcs={[url]} alt={`${customer.name} ${i + 1}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content slots */}
            <div className="flex flex-col gap-3 p-5 pb-4 overflow-y-auto">
              {/* Header */}
              <div>
                <h2 className="truncate text-[20px] font-black text-primary tracking-tight">
                  {customer.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-secondary">
                  <Icon name="phone" size={14} strokeWidth={2.5} />
                  {detailLoading ? "…" : phone || t("gallery.no_phone")}
                </p>
              </div>

              {/* Body */}
              {!detailLoading && detail?.address && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary">{t("gallery.address")}</p>
                  <p className="mt-0.5 text-[14px] font-medium text-primary leading-snug">{detail.address}</p>
                </div>
              )}
              {!detailLoading && detail?.landmark && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary">📍 {t("gallery.landmark")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-primary leading-relaxed">{detail.landmark}</p>
                </div>
              )}
              {!detailLoading && detail?.notes && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-secondary">📌 {t("gallery.notes")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-primary leading-relaxed line-clamp-3">{detail.notes}</p>
                </div>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-hover px-3 py-1 text-[11px] font-bold text-secondary border border-card-border">
                  {photos.length} 📷
                </span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-auto flex flex-col gap-2 border-t border-card-border/60 p-5 pt-4">
              <Link
                href={`/customers/${customer.id}`}
                className="btn-primary w-full py-3 text-[14px]"
              >
                {t("gallery.view_profile")}
              </Link>
              <div className="grid grid-cols-3 gap-2">
                {phoneDigits && (
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-90"
                  >
                    <Icon name="phone" size={16} strokeWidth={2.5} />
                    {t("gallery.call")}
                  </a>
                )}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#20bd5a] active:scale-90"
                  >
                    <Icon name="whatsapp" size={16} strokeWidth={2.5} />
                    WA
                  </a>
                )}
                {navLink && (
                  <a
                    href={navLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-2.5 text-[12px] font-bold text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-90"
                  >
                    <Icon name="map-pin" size={16} strokeWidth={2.5} />
                    {t("gallery.navigate")}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
