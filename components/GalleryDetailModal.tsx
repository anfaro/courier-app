// components/GalleryDetailModal.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
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
  useScrollLock(customer !== null);

  const [detail, setDetail] = useState<FullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!customer) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
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

          {/* Floating card: media → header → body → metadata → footer (mt-auto) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-card-border bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={customer.name}
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white active:scale-90"
            >
              <Icon name="close" size={18} strokeWidth={2.5} />
            </button>

            {/* Media — opaque image */}
            <div className="relative aspect-[4/3] w-full shrink-0 bg-black">
              <GalleryImage srcs={customer.housePictures} alt={customer.name} />
            </div>

            {/* Content slots */}
            <div className="flex flex-col gap-3 p-5 pb-4">
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
                  {customer.housePictures.length} 📷
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