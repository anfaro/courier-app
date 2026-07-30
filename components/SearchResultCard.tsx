// components/SearchResultCard.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Icon from "@/components/Icon";

interface SearchResultCustomer {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  housePictureUrl: string | null;
  landmark: string | null;
  notes: string | null;
  createdAt: string | null;
  clusters: string[];
  lastVisitedAt: string | null;
  visitCount: number;
}

export default function SearchResultCard({ customer, index }: { customer: SearchResultCustomer; index: number }) {
  const hasGps = customer.latitude && customer.longitude;
  const daysSinceLastVisit = customer.lastVisitedAt
    ? Math.floor((Date.now() - new Date(customer.lastVisitedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.04 }}
      className="rounded-[28px] bg-card border border-card-border shadow-sm overflow-hidden active:scale-[0.98] transition-all"
    >
      <Link href={`/customers/${customer.id}`} className="block p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {hasGps && <Icon name="map-pin" size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
              <h3 className="text-[16px] font-black text-primary truncate">{customer.name}</h3>
            </div>

            <p className="text-[13px] font-medium text-secondary leading-snug line-clamp-2 mb-2">{customer.address}</p>

            {customer.phoneNumber && (
              <a
                href={`tel:${customer.phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:underline active:scale-90 mb-2"
              >
                <Icon name="phone" size={13} strokeWidth={2.5} />
                {customer.phoneNumber}
              </a>
            )}

            {customer.landmark && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold truncate max-w-[240px]">
                  📍 {customer.landmark}
                </span>
              </div>
            )}

            {customer.clusters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customer.clusters.map((cl) => (
                  <span key={cl} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-hover text-secondary font-bold">
                    {cl}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] font-medium text-secondary">
              {customer.visitCount > 0 && (
                <span>
                  {customer.visitCount} visit{customer.visitCount !== 1 ? "s" : ""}
                </span>
              )}
              {daysSinceLastVisit !== null && (
                <span>
                  Last visited{" "}
                  {daysSinceLastVisit === 0
                    ? "today"
                    : daysSinceLastVisit === 1
                    ? "yesterday"
                    : `${daysSinceLastVisit} days ago`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {customer.phoneNumber && (
              <a
                href={`tel:${customer.phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 active:scale-90 transition-all"
                title="Call"
              >
                <Icon name="phone" size={16} strokeWidth={2.5} />
              </a>
            )}
            {hasGps && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 active:scale-90 transition-all"
                title="Navigate"
              >
                <Icon name="map-pin" size={16} strokeWidth={2.5} />
              </a>
            )}
            <Link
              href={`/customers/${customer.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-secondary hover:text-primary active:scale-90 transition-all"
              title="View Details"
            >
              <Icon name="chevron-right" size={16} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
