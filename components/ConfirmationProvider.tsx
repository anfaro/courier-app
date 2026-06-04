// components/ConfirmationProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import { useScrollLock } from "@/lib/useScrollLock";

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "warning";
}

interface ConfirmationContextType {
  askConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [dialogConfig, setDialogConfig] = useState<ConfirmationOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const askConfirmation = useCallback((options: ConfirmationOptions) => {
    setDialogConfig(options);
    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  useScrollLock(dialogConfig !== null);

  const handleCancel = () => {
    if (resolveCallback) resolveCallback(false);
    setDialogConfig(null);
  };

  const handleConfirm = () => {
    if (resolveCallback) resolveCallback(true);
    setDialogConfig(null);
  };

  return (
    <ConfirmationContext.Provider value={{ askConfirmation }}>
      {children}

      <AnimatePresence>
        {dialogConfig && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              onClick={handleCancel}
            />

            {/* M3 Expressive Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative w-full max-w-sm rounded-[32px] bg-card p-8 shadow-2xl border border-card-border dark:border-slate-800"
            >
              {/* Type Icon */}
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                dialogConfig.type === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-600' :
                dialogConfig.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' :
                'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
              }`}>
                {dialogConfig.type === 'danger' ? '🗑️' : 
                 dialogConfig.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>

              <h2 className="text-xl font-black text-primary tracking-tight mb-2">
                {dialogConfig.title}
              </h2>
              <p className="text-[15px] font-medium text-secondary leading-relaxed mb-8">
                {dialogConfig.message}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  className={`btn-primary w-full py-4 text-[15px] ${
                    dialogConfig.type === 'danger' ? '!bg-red-600 !shadow-red-600/20 hover:!bg-red-700' : ''
                  }`}
                >
                  {dialogConfig.confirmText || t("action.confirm")}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-outline w-full py-4 text-[15px]"
                >
                  {dialogConfig.cancelText || t("action.cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
}
