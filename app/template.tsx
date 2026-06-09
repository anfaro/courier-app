// app/template.tsx
"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // The starting state of the page (invisible and slightly pushed down)
      initial={{ opacity: 0, y: 15 }}
      // The final state of the page (fully visible and in its normal position)
      animate={{ opacity: 1, y: 0 }}
      // How the animation should run
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}
