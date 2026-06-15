"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function SectionWrapper({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
