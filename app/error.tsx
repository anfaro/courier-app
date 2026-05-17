// app/error.tsx
"use client";

import { useState, useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system/logs/record-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mx-auto w-full max-w-sm rounded-[2.5rem] bg-card p-8 text-center shadow-sm border border-card-border">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/20 text-3xl">
          ⚠️
        </div>
        <h2 className="mb-2 text-xl font-black text-primary">Something went wrong</h2>
        <p className="mb-4 text-[14px] font-medium text-secondary">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mb-4 text-[12px] font-bold text-secondary/60 hover:text-secondary active:scale-90 transition-all"
        >
          {showDetails ? "▲ Hide details" : "▼ Show details"}
        </button>

        {showDetails && (
          <div className="mb-5 rounded-2xl bg-red-50/50 dark:bg-red-950/10 p-4 text-left border border-red-100 dark:border-red-900/50">
            <p className="text-[11px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all leading-relaxed">
              {error.name && `${error.name}: `}{error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </p>
          </div>
        )}

        <button
          onClick={reset}
          className="rounded-full bg-blue-600 px-8 py-3 text-[14px] font-bold text-white shadow-lg shadow-blue-500/20 active:scale-90 transition-all hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
