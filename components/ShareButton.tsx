"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

export default function ShareButton({ customerId }: { customerId: string }) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${customerId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("customer.share_copied"), "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm transition hover:bg-emerald-200 dark:hover:bg-emerald-800/60 hover:shadow-md active:scale-90 focus:outline-none"
      title={t("customer.share")}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>
  );
}
