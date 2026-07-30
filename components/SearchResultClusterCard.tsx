// components/SearchResultClusterCard.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Icon from "@/components/Icon";

interface SearchResultCluster {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string | null;
  customerCount: number;
}

export default function SearchResultClusterCard({ cluster, index }: { cluster: SearchResultCluster; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.04 }}
      className="rounded-[28px] bg-card border border-card-border shadow-sm active:scale-[0.98] transition-all"
    >
      <Link href={`/clusters/${cluster.id}`} className="flex items-center justify-between p-4 sm:p-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-black text-primary">{cluster.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[12px] font-bold text-secondary">
              {cluster.customerCount} customer{cluster.customerCount !== 1 ? "s" : ""}
            </span>
            {cluster.notes && (
              <span className="text-[12px] text-secondary/70 truncate max-w-[200px]">{cluster.notes}</span>
            )}
          </div>
        </div>
        <Icon name="chevron-right" size={18} strokeWidth={3} className="text-secondary shrink-0" />
      </Link>
    </motion.div>
  );
}
