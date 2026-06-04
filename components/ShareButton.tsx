"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useScrollLock } from "@/lib/useScrollLock";

export default function ShareButton({ customerId }: { customerId: string }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/share/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) throw new Error("Failed to generate token");
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.shareToken}`;
      setShareUrl(url);
      setShowModal(true);
    } catch {
      showToast("Failed to generate share link", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t("customer.share_copied"), "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isGenerating}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm transition hover:bg-emerald-200 dark:hover:bg-emerald-800/60 hover:shadow-md active:scale-90 disabled:opacity-50 focus:outline-none"
        title={t("customer.share")}
      >
        {isGenerating ? (
          <span className="h-5 w-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-sm rounded-[32px] bg-card p-6 shadow-2xl border border-card-border"
            >
              <h3 className="text-xl font-black text-primary mb-1">
                {t("customer.share")}
              </h3>
              <p className="text-[13px] font-medium text-secondary mb-5">
                Share this link with your customer
              </p>

              <div className="flex items-center gap-2 rounded-2xl border border-card-border bg-background px-4 py-3">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 min-w-0 bg-transparent text-[13px] font-medium text-primary outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white active:scale-90 transition-all hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full rounded-full bg-surface-hover py-3 text-[14px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90 border border-card-border"
              >
                {t("action.cancel") || "Close"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
