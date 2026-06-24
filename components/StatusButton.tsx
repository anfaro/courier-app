"use client";

import { memo } from "react";
import { motion } from "framer-motion";

export default memo(function StatusButton({
  label,
  color,
  onClick,
  disabled,
  className = "",
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/50",
    orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 border-orange-200 dark:border-orange-800/50",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800/50",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800/50",
  };

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.85 }}
      onClick={(e) => { if (disabled) return; e.stopPropagation(); onClick(); }}
      className={`px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${colorMap[color] || ""} ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'active:scale-90'} ${className}`}
    >
      {label}
    </motion.button>
  );
});
