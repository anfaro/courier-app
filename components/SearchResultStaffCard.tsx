// components/SearchResultStaffCard.tsx
"use client";

import { motion } from "framer-motion";
import Icon from "@/components/Icon";

interface SearchResultUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SearchResultStaffCard({ user, index }: { user: SearchResultUser; index: number }) {
  const roleColors: Record<string, string> = {
    superadmin: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    courier: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.04 }}
      className="rounded-[28px] bg-card border border-card-border shadow-sm p-4 sm:p-5 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-black text-primary">{user.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${roleColors[user.role] || "bg-surface-hover text-secondary"}`}>
              {user.role}
            </span>
          </div>
          <p className="text-[13px] font-medium text-secondary mt-0.5">{user.email}</p>
        </div>
        <Icon name="chevron-right" size={18} strokeWidth={3} className="text-secondary shrink-0" />
      </div>
    </motion.div>
  );
}
