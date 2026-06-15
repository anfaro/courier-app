"use client";

import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface SplitModalData {
  deliveryId: string;
  customerName: string;
  currentPackages: number;
  targetStatus: string;
  splitCount: number;
  remainingDeliveryIds?: string[];
}

interface SplitModalProps {
  data: SplitModalData | null;
  onClose: () => void;
  onChange: (updater: (prev: SplitModalData | null) => SplitModalData | null) => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

export default function SplitModal({ data, onClose, onChange, onConfirm, t }: SplitModalProps) {
  return (
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-card rounded-[32px] p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg">
                📦
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-primary">
                  {t("session.split_title").replace("[STATUS]", data.targetStatus)}
                </h3>
                <p className="text-[12px] font-medium text-secondary mt-0.5">
                  {data.customerName}
                </p>
              </div>
            </div>

            <p className="text-[13px] font-medium text-secondary mb-5">
              {t("session.split_desc").replace("[N]", String(data.currentPackages))}
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.button
                whileTap={{ scale: 0.85 }}
                disabled={data.splitCount <= 0}
                onClick={() => onChange(prev => prev ? { ...prev, splitCount: Math.max(0, prev.splitCount - 1) } : null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-primary font-black text-xl disabled:opacity-30 border border-card-border active:scale-90"
              >
                –
              </motion.button>
              <div className="text-center">
                <p className="text-[32px] font-black text-primary">{data.splitCount}</p>
                <p className="text-[10px] font-medium text-secondary uppercase tracking-widest">
                  {t("session.quantity")}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                disabled={data.splitCount >= data.currentPackages}
                onClick={() => onChange(prev => prev ? { ...prev, splitCount: Math.min(prev.currentPackages, prev.splitCount + 1) } : null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-xl disabled:opacity-30 active:scale-90"
              >
                +
              </motion.button>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="btn-outline flex-1"
              >
                {t("action.cancel")}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onConfirm}
                disabled={data.splitCount <= 0}
                className="btn-primary flex-1"
              >
                {t("session.split_confirm")}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
