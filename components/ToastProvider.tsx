// components/ToastProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5" />
                  </svg>
                ) : toast.type === 'error' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
                  </svg>
                ) : toast.type === 'warning' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 3l9.5 16.5h-19L12 3z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 10v4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4" />
                    <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
                  </svg>
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
