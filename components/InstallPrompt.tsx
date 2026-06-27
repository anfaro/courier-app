"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import Icon from "@/components/Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      setIsStandalone(true);
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as any).MSStream
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsDismissed(true);
    }
  };

  const showInstall =
    !isStandalone && !isDismissed && (!!deferredPrompt || isIOS);

  if (!showInstall) return null;

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-sm"
        >
          <motion.div
            layout
            className="rounded-[32px] bg-card/90 dark:bg-slate-900/90 p-4 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-2xl border border-card-border/50"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 12L28 8L38 12V28L28 32L18 28V12Z"
                    fill="white"
                  />
                  <path
                    d="M18 12L28 16L38 12"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M28 16V32"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black text-primary">
                  {t("pwa.install_title")}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-secondary">
                  {t("pwa.install_desc")}
                </p>
              </div>
              <button
                onClick={() => setIsDismissed(true)}
                className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-surface-hover active:scale-90 transition-all"
              >
                <Icon name="close" size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              {deferredPrompt ? (
                <button
                  onClick={handleInstall}
                  className="btn-primary flex-1 text-[13px] py-2.5"
                >
                  {t("pwa.install_btn")}
                </button>
              ) : null}
              {isIOS ? (
                <div className="flex-1 rounded-full bg-surface-hover px-4 py-2.5 text-center text-[12px] font-bold text-secondary leading-tight">
                  {t("pwa.ios_instructions")}
                </div>
              ) : null}
              <button
                onClick={() => setIsDismissed(true)}
                className="btn-outline text-[13px] py-2.5 px-5"
              >
                {t("action.cancel")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
