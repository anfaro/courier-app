// app/error.tsx
"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[32px] bg-red-50 dark:bg-red-950/20 shadow-sm border border-red-100 dark:border-red-900/50 backdrop-blur-xl">
        <span className="text-5xl">⚠️</span>
      </div>

      <h1 className="mb-2 text-4xl font-black tracking-tight text-primary">Something went wrong</h1>
      <p className="mb-2 max-w-xs text-[15px] font-medium text-secondary leading-relaxed">
        An unexpected error occurred. Our team has been notified.
      </p>
      {error.digest && (
        <p className="mb-8 text-[11px] font-mono text-secondary/50">Error ID: {error.digest}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center gap-2 rounded-full bg-card px-8 py-4 text-[15px] font-bold text-primary border border-card-border transition-all hover:bg-surface-hover active:scale-90"
        >
          Back to Home
        </button>
      </div>

      <p className="mt-12 text-[12px] font-medium text-secondary/50">
        &copy; 2026 Courier Management System &bull; v0.1.0
      </p>
    </div>
  );
}
