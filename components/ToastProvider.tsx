// components/ToastProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* TOAST CONTAINER */}
      <div aria-live="polite" aria-atomic="false" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 w-full max-w-xs pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 rounded-[24px] px-6 py-4 shadow-2xl backdrop-blur-md border ${
                toast.type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-500' :
                toast.type === 'error' ? 'bg-red-600/90 text-white border-red-500' :
                toast.type === 'warning' ? 'bg-orange-500/90 text-white border-orange-400' :
                'bg-gray-900/90 text-white border-gray-700 dark:bg-slate-800/90'
              }`}
            >
              <span className="shrink-0">
                {toast.type === 'success' ? (
                  <Icon name="success" size={24} strokeWidth={2.5} />
                ) : toast.type === 'error' ? (
                  <Icon name="error" size={24} strokeWidth={2.5} />
                ) : toast.type === 'warning' ? (
                  <Icon name="warning" size={24} strokeWidth={2.5} />
                ) : (
                  <Icon name="info" size={24} strokeWidth={2.5} />
                )}
              </span>
              <p className="text-[14px] font-black tracking-tight leading-tight">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
