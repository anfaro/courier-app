"use client";

import { memo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import Icon from "@/components/Icon";

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
}

interface Delivery {
  id: string;
  incomingId: string;
  customerId: string;
  packages: string;
  customer: Customer;
}

type CardStatus = "pending" | "returned" | "rescheduled" | "delivered";

const statusStyles: Record<CardStatus, { border: string; bg: string }> = {
  pending: { border: "border-l-blue-500", bg: "bg-blue-50/30 dark:bg-blue-950/10" },
  returned: { border: "border-l-orange-500", bg: "bg-orange-50/30 dark:bg-orange-950/10" },
  rescheduled: { border: "border-l-purple-500", bg: "bg-purple-50/30 dark:bg-purple-950/10" },
  delivered: { border: "border-l-emerald-500", bg: "bg-emerald-50/30 dark:bg-emerald-950/10" },
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
  children: React.ReactNode;
  onClick?: () => void;
  status?: CardStatus;
}) {
  const { locale } = useLanguage();
  const dateLocale = locale === "id" ? "id-ID" : "en-GB";
  const firstPkg = group.deliveries[0]?.packages;
  const pkgCount = Number(firstPkg) || 1;
  const s = statusStyles[status];

  return (
    <div
      onClick={onClick}
      className={`rounded-[24px] bg-card/80 backdrop-blur-xl shadow-sm mb-3 p-5 border border-card-border/50 ${s.border} border-l-4 ${s.bg} ${onClick ? 'cursor-pointer hover:bg-surface-hover/80 transition-all active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-[16px] font-black shadow-md">
          {group.customer.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[14px] font-bold text-primary leading-tight">
              {group.customer.name}
            </p>
            {!isCombined && pkgCount > 1 && (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                ×{pkgCount}
              </span>
            )}
            {isCombined && (
              <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                ×{group.totalPackages}
              </span>
            )}
          </div>
          {group.customer.address && (
            <p className="text-[12px] text-secondary mt-0.5">
              {group.customer.address}
            </p>
          )}
          {isCombined && (
            <div className="flex items-center gap-1 mt-1.5">
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
          <div className="mt-3 flex flex-wrap gap-2 w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
