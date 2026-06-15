"use client";

import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";
import type { Delivery } from "@/app/progress/[sessionId]/page";

interface DeliveryPopoverProps {
  delivery: Delivery | null;
  onClose: () => void;
}

export default function DeliveryPopover({ delivery, onClose }: DeliveryPopoverProps) {
  return (
    <AnimatePresence>
      {delivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.9 }}
            className="relative w-full max-w-sm bg-card rounded-[40px] overflow-hidden shadow-2xl border border-card-border"
          >
            {/* Hero Image */}
            <div className="relative h-52 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700">
              {delivery.customer.housePictureUrl ? (
                <img
                  src={delivery.customer.housePictureUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[80px] font-black text-white/20 select-none">
                    {delivery.customer.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[22px] font-extrabold text-white drop-shadow-sm truncate">
                    {delivery.customer.name}
                  </p>
                  <p className="text-[13px] font-medium text-white/80 mt-0.5">
                    {(Number(delivery.packages) || 1)} {(Number(delivery.packages) || 1) > 1 ? "packages" : "package"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 ml-3 h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 hover:bg-white/30 transition-all"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-5 space-y-3">
              {delivery.customer.phoneNumber && (
                <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Icon name="phone" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Phone</p>
                    <p className="text-[14px] font-bold text-primary">{delivery.customer.phoneNumber}</p>
                  </div>
                </div>
              )}
              {delivery.customer.address && (
                <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <Icon name="map-pin" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Address</p>
                    <p className="text-[14px] font-bold text-primary">{delivery.customer.address}</p>
                  </div>
                </div>
              )}
              {delivery.incoming?.time && (
                <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <Icon name="clock" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Incoming Time</p>
                    <p className="text-[14px] font-bold text-primary">
                      {new Date(delivery.incoming.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
