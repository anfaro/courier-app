"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import Icon from "@/components/Icon";

export default function SharePageActions({ shareToken }: { shareToken: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full rounded-[1.75rem] border border-card-border bg-card p-5 shadow-sm hover:bg-surface-hover transition-all active:scale-90 flex items-center justify-center gap-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <Icon name="share" size={20} strokeWidth={2.5} />
      </div>
      <span className="text-[14px] font-bold text-primary">
        {copied ? "Copied!" : "Copy this page"}
      </span>
    </button>
  );
}
