// components/ErrorBoundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showDetails: boolean;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    componentStack: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack || null });

    // Send error to our global log system
    fetch("/api/admin/system/logs/record-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        pathname: window.location.pathname
      }),
    }).catch(() => {}); // Silent fail
  }

  private handleCopy = () => {
    const { error, componentStack } = this.state;
    const text = [
      error ? `${error.name}: ${error.message}` : "",
      error?.stack ? `\n\n${error.stack}` : "",
      componentStack ? `\n\nComponent stack:\n${componentStack}` : "",
    ].join("");

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    };

    copy()
      .then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      })
      .catch(() => {});
  };

  public render() {
    if (this.state.hasError) {
      const { error, showDetails, copied, componentStack } = this.state;
      const detailsText = [
        error?.name && `${error.name}: `,
        error?.message,
        error?.stack && `\n\n${error.stack}`,
        componentStack && `\n\nComponent stack:\n${componentStack}`,
      ].filter(Boolean).join("");

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-red-100 text-[36px] shadow-inner">
            ⚠️
          </div>
          <h1 className="mb-2 text-[24px] font-black text-primary tracking-tight">Something went wrong</h1>
          <p className="mb-6 max-w-xs text-[15px] font-medium text-secondary">
            {error?.message || "An unexpected error occurred. Our engineers have been notified."}
          </p>

          <button
            onClick={() => this.setState({ showDetails: !showDetails })}
            className="mb-4 text-[12px] font-bold text-secondary/60 hover:text-secondary active:scale-90 transition-all"
          >
            {showDetails ? "▲ Hide details" : "▼ Show details"}
          </button>

          {showDetails && (
            <div className="mb-5 w-full max-w-md rounded-2xl bg-red-50/50 dark:bg-red-950/10 p-4 text-left border border-red-100 dark:border-red-900/50">
              <pre className="max-h-60 overflow-y-auto text-[11px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all leading-relaxed custom-scrollbar">
                {detailsText || "No stack trace available."}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleCopy}
              className="rounded-full bg-surface-hover border border-card-border px-6 py-3 text-[13px] font-bold text-primary shadow-sm active:scale-90 transition-all"
            >
              {copied ? "Copied!" : "Copy details"}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
