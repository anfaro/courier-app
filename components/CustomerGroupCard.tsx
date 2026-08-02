"use client";

import { memo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import Icon from "@/components/Icon";

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  landmark?: string;
}

interface Delivery {
  id: string;
  incomingId: string;
  customerId: string;
  packages: string;
  customer: Customer;
}

type CardStatus = "pending" | "returned" | "rescheduled" | "delivered";

const statusStyles: Record<CardStatus, { dot: string; label: string }> = {
  pending: { dot: "bg-blue-500", label: "text-blue-600 dark:text-blue-400" },
  returned: { dot: "bg-orange-500", label: "text-orange-600 dark:text-orange-400" },
  rescheduled: { dot: "bg-purple-500", label: "text-purple-600 dark:text-purple-400" },
  delivered: { dot: "bg-emerald-500", label: "text-emerald-600 dark:text-emerald-400" },
};

const statusKeys: Record<CardStatus, string> = {
  pending: "session.pending",
  returned: "session.returned_section",
  rescheduled: "session.rescheduled_section",
  delivered: "session.delivered_section",
};

export default memo(function CustomerGroupCard({
  group,
  isCombined,
  sessionData,
  children,
  onClick,
  status = "pending",
}: {
  group: { customer: Customer; deliveries: Delivery[]; totalPackages: number };
  isCombined: boolean;
  sessionData: any;
  children?: React.ReactNode;
  onClick?: () => void;
  status?: CardStatus;
}) {
  const { t, locale } = useLanguage();
  const dateLocale = locale === "id" ? "id-ID" : "en-GB";
  const firstPkg = group.deliveries[0]?.packages;
  const pkgCount = Number(firstPkg) || 1;
  const s = statusStyles[status];
  const hasPin = Boolean(group.customer.latitude && group.customer.longitude);
  const phoneDigits = group.customer.phoneNumber?.replace(/\D/g, "");
  const displayLine = group.customer.phoneNumber || group.customer.address || "";

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 transition-all ${onClick ? 'cursor-pointer hover:bg-surface-hover/60 active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-[15px] font-black shadow-md">
          {group.customer.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[15px] font-extrabold tracking-tight text-primary truncate">
              {group.customer.name}
            </p>
            {!isCombined && pkgCount > 1 && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                ×{pkgCount}
              </span>
            )}
            {isCombined && (
              <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                ×{group.totalPackages}
              </span>
            )}
          </div>
          {group.customer.landmark && (
            <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight">
              📍 {group.customer.landmark.length > 20 ? group.customer.landmark.substring(0, 20) + "…" : group.customer.landmark}
            </span>
          )}
          {displayLine && (
            <div className="mt-1 flex items-center gap-1.5">
              {group.customer.phoneNumber && (
                <Icon name="whatsapp" size={12} className="text-[#25D366] shrink-0" />
              )}
              <p className="text-[12px] font-medium text-secondary truncate">
                {displayLine}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${s.label}`}>
              {t(statusKeys[status])}
            </span>
          </span>
          {phoneDigits && (
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-all hover:bg-[#20bd5a] hover:shadow-md active:scale-90"
              aria-label="WhatsApp"
            >
              <Icon name="whatsapp" size={14} />
            </a>
          )}
          {hasPin && (
            <a
              href={`https://maps.google.com/?q=${group.customer.latitude},${group.customer.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm transition-all hover:bg-blue-200 dark:hover:bg-blue-800/60 hover:shadow-md active:scale-90"
              aria-label="Open map"
            >
              <Icon name="map-pin" size={14} />
            </a>
          )}
        </div>
      </div>
      {isCombined && (
        <div className="flex items-center gap-1 mt-1.5 pl-[52px]">
          <Icon name="clock" size={11} strokeWidth={2.5} className="text-secondary/60" />
          <p className="text-[10px] font-medium text-secondary/60">
            {group.deliveries.map((d: Delivery) => {
              const inc = sessionData.incomings?.find((i: any) => i.id === d.incomingId);
              return inc ? new Date(inc.time).toLocaleTimeString(dateLocale, {
                hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
              }) : "";
            }).filter(Boolean).join(", ")}
          </p>
        </div>
      )}
      {children && (
        <div className="mt-2 flex flex-wrap gap-2 w-full pl-[52px]">
          {children}
        </div>
      )}
    </div>
  );
});
