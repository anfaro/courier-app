// components/AdminWipeData.tsx
"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";

export default function AdminWipeData() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  
  const [isWiping, setIsWiping] = useState(false);
  const [showCodeStep, setShowCodeStep] = useState(false);
  useScrollLock(showCodeStep);
  const [userInput, setUserInput] = useState("");

  const handleInitialClick = async () => {
    const firstStep = await askConfirmation({
      title: t("admin.wipe_title"),
      message: t("admin.wipe_confirm_1_msg"),
      confirmText: t("action.confirm"),
      type: "warning"
    });

    if (!firstStep) return;

    const secondStep = await askConfirmation({
      title: t("admin.wipe_confirm_final_title"),
      message: t("admin.wipe_confirm_final_msg"),
      confirmText: t("admin.wipe_execute_btn"),
      type: "danger"
    });

    if (secondStep) {
      setShowCodeStep(true);
    }
  };

  const executeWipe = async () => {
    if (userInput !== "CONFIRM-WIPE") {
      showToast("Invalid code", "error");
      return;
    }

    setIsWiping(true);
    try {
      const res = await fetch("/api/admin/wipe-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCode: "CONFIRM-WIPE" }),
      });

      if (res.ok) {
        showToast(t("admin.wipe_executing"), "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast("Server rejected wipe request.", "error");
      }
    } catch (err) {
      showToast("Critical error during wipe.", "error");
    } finally {
      setIsWiping(false);
      setShowCodeStep(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 mb-12">
      <div className="rounded-[32px] bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900 text-2xl shadow-inner">
            ☢️
          </div>
          <div>
            <h2 className="text-[17px] font-black text-red-900 dark:text-red-200 tracking-tight">{t("admin.danger_zone")}</h2>
            <p className="text-[13px] font-medium text-red-700 dark:text-red-400">{t("admin.wipe_desc")}</p>
          </div>
        </div>

        <button 
          onClick={handleInitialClick}
          className="btn-danger w-full py-4 !bg-red-600 !text-white !border-none shadow-xl shadow-red-600/20"
        >
          {t("admin.wipe_btn")}
        </button>
      </div>

      {/* --- THIRD STEP: CODE VERIFICATION MODAL --- */}
      <AnimatePresence>
        {showCodeStep && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => !isWiping && setShowCodeStep(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[40px] bg-card p-8 shadow-2xl border border-red-500/30"
            >
              <h3 className="text-2xl font-black text-primary mb-2">{t("admin.wipe_verification")}</h3>
              <p className="text-[14px] font-medium text-secondary mb-6 leading-relaxed">
                {t("admin.wipe_type_code").replace("[CODE]", "CONFIRM-WIPE")}
              </p>

              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                placeholder="Type the code here..."
                className="w-full rounded-2xl border border-red-200 dark:border-red-900 bg-background px-5 py-4 text-[16px] font-black tracking-widest text-primary focus:ring-4 focus:ring-red-500/10 outline-none transition-all mb-6"
                autoFocus
              />

              <div className="flex flex-col gap-3">
                <button 
                  onClick={executeWipe}
                  disabled={userInput !== "CONFIRM-WIPE" || isWiping}
                  className="btn-danger w-full py-4 !bg-red-600 !text-white disabled:opacity-30 disabled:grayscale"
                >
                  {isWiping ? t("admin.wipe_executing") : t("admin.wipe_execute_btn")}
                </button>
                <button 
                  onClick={() => setShowCodeStep(false)}
                  disabled={isWiping}
                  className="btn-outline w-full py-4"
                >
                  {t("action.cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
