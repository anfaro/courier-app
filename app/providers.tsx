// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmationProvider } from "@/components/ConfirmationProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <ErrorBoundary>
                <OfflineBanner />
                {children}
              </ErrorBoundary>
            </ConfirmationProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
