"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const MapClientWrapper = dynamic(
  () => import("@/components/MapClientWrapper"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full text-secondary text-[13px] font-bold">
      Initializing Map Engine...
    </div>
  )}
);

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

interface Delivery {
  id: string;
  sessionId: string;
  incomingId: string;
  customerId: string;
  status: "pending" | "delivered" | "returned" | "rescheduled";
  createdAt: string;
  customer: Customer;
  incoming?: { time: string; packages: string };
}

interface Incoming {
  id: string;
  time: string;
  packages: string;
  deliveries?: Delivery[];
}

interface SessionData {
  id: string;
  date: string;
  totalPackages: string;
  deliveredPackages: string;
  incomings: Incoming[];
  deliveries: Delivery[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  const { data: authSession } = useSession();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);

  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [packagesCount, setPackagesCount] = useState("");
  const [customerAssignments, setCustomerAssignments] = useState<Record<string, number>>({});
  const [savingIncoming, setSavingIncoming] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [returnedExpanded, setReturnedExpanded] = useState(false);
  const [rescheduledExpanded, setRescheduledExpanded] = useState(false);
  const [splitModal, setSplitModal] = useState<{
    deliveryId: string;
    customerName: string;
    currentPackages: number;
    targetStatus: string;
    splitCount: number;
  } | null>(null);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      } else if (res.status === 404 || res.status === 403) {
        router.push("/progress");
      }
    } catch (err) {
      console.warn("Failed to fetch session", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers?limit=500&offset=0");
        if (res.ok) {
          const data = await res.json();
          setAllCustomers(data.customers || []);
        }
      } catch {}
    }
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!showIncomingModal) {
      setPackagesCount("");
      setCustomerAssignments({});
      setCustomerSearch("");
    }
  }, [showIncomingModal]);

  const filteredCustomers = availableCustomers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phoneNumber && c.phoneNumber.includes(q))
    );
  });

  useEffect(() => {
    if (allCustomers.length > 0) {
      setAvailableCustomers(allCustomers);
    }
  }, [allCustomers]);

  async function handleDelete() {
    const confirmed = await askConfirmation({
      title: t("session.delete_confirm_title"),
      message: t("session.delete_confirm_msg"),
      type: "danger",
      confirmText: t("action.delete"),
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        showToast(t("session.deleted"), "success");
        router.push("/progress");
      }
    } catch {
      showToast("Failed to delete session", "error");
    }
  }

  async function handleAddIncoming() {
    const count = Number(packagesCount);
    if (!count || count < 1) {
      showToast("Please enter a valid packages count", "error");
      return;
    }
    const assignments = Object.entries(customerAssignments)
      .filter(([_, qty]) => qty > 0)
      .map(([customerId, packages]) => ({ customerId, packages }));
    const totalAssigned = assignments.reduce((sum, a) => sum + a.packages, 0);
    if (totalAssigned !== count) {
      showToast(`Total assigned packages (${totalAssigned}) must match ${count}`, "error");
      return;
    }
    setSavingIncoming(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/incomings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: count, customerAssignments: assignments }),
      });
      if (res.ok) {
        showToast(
          t("session.incoming_saved").replace("[N]", String(count)),
          "success"
        );
        setShowIncomingModal(false);
        fetchSession();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to add incoming", "error");
      }
    } catch {
      showToast("Failed to add incoming", "error");
    } finally {
      setSavingIncoming(false);
    }
  }

  async function handleStatusChange(deliveryId: string, newStatus: string) {
    const delivery = sessionData?.deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    const pkgCount = Number(delivery.packages) || 1;
    if (pkgCount > 1) {
      setSplitModal({
        deliveryId,
        customerName: delivery.customer.name,
        currentPackages: pkgCount,
        targetStatus: newStatus,
        splitCount: Math.ceil(pkgCount / 2),
      });
      return;
    }
    await doStatusChange(deliveryId, newStatus);
  }

  async function doStatusChange(deliveryId: string, newStatus: string, splitCount?: number) {
    try {
      const body: any = { status: newStatus };
      if (splitCount) body.splitCount = splitCount;
      const res = await fetch(`/api/sessions/${sessionId}/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(t("session.delivery_updated"), "success");
        fetchSession();
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  async function confirmSplit() {
    if (!splitModal) return;
    await doStatusChange(splitModal.deliveryId, splitModal.targetStatus, splitModal.splitCount);
    setSplitModal(null);
  }

  if (loading || !sessionData) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Breadcrumbs />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-surface-hover rounded-full" />
            <div className="h-4 w-32 bg-surface-hover rounded-full" />
            <div className="h-4 w-full bg-surface-hover rounded-full mt-8" />
            <div className="h-32 w-full bg-surface-hover rounded-[24px]" />
          </div>
        </main>
      </div>
    );
  }

  const total = Number(sessionData.totalPackages) || 0;
  const delivered = Number(sessionData.deliveredPackages) || 0;
  const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const filterBySearch = (d: Delivery) => {
    if (!deliverySearch.trim()) return true;
    const q = deliverySearch.toLowerCase();
    return d.customer.name.toLowerCase().includes(q) ||
      (d.customer.phoneNumber && d.customer.phoneNumber.includes(q));
  };
  const pendingDeliveries = sessionData.deliveries.filter((d) => d.status === "pending" && filterBySearch(d));
  const deliveredDeliveries = sessionData.deliveries.filter((d) => d.status === "delivered" && filterBySearch(d));
  const returnedDeliveries = sessionData.deliveries.filter((d) => d.status === "returned" && filterBySearch(d));
  const rescheduledDeliveries = sessionData.deliveries.filter((d) => d.status === "rescheduled" && filterBySearch(d));

  const mapCustomers = pendingDeliveries
    .map((d) => d.customer)
    .filter((c) => c.latitude && c.longitude);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">
              {new Date(sessionData.date + "T00:00:00").toLocaleDateString(dateLocale, {
                weekday: "long", day: "2-digit", month: "long", year: "numeric"
              })}
            </h1>
            <p className="text-[13px] font-medium text-secondary mt-1">
              {total} {t("session.packages")} · {delivered} {t("session.delivered")}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="btn-danger"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>

        {/* Progress Bar */}
        <div className="rounded-[24px] bg-card border border-card-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-secondary uppercase tracking-widest">
              {t("session.progress")}
            </span>
            <span className="text-[22px] font-black text-primary">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-hover overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-medium text-secondary">
            <span>0</span>
            <span>{total}</span>
          </div>
        </div>

        {/* Add Incoming Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowIncomingModal(true)}
          className="btn-primary w-full"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("session.add_incoming")}
        </motion.button>

        {/* Incoming List */}
        {sessionData.incomings.length > 0 && (
          <div>
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">
              {t("session.incoming_list")}
            </h2>
            <div className="space-y-3">
              {sessionData.incomings.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-[20px] bg-card border border-card-border p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg">
                        🚛
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-primary">
                          {inc.packages} {t("session.packages")}
                        </p>
                        <p className="text-[11px] font-medium text-secondary">
                          {new Date(inc.time).toLocaleTimeString(dateLocale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery List */}
        {sessionData.deliveries.length > 0 && (
          <div>
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">
              {t("session.delivery_list")}
            </h2>

            {/* Delivery Search */}
            <div className="relative mb-3">
              <input
                type="text"
                value={deliverySearch}
                onChange={(e) => setDeliverySearch(e.target.value)}
                placeholder="Search delivery..."
                className="w-full rounded-full bg-surface-hover pl-10 pr-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Pending - scrollable */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {pendingDeliveries.length > 0 ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 sticky top-0 bg-background py-1 z-10">
                    {t("session.pending")} ({pendingDeliveries.length})
                  </p>
                  <div className="space-y-2">
                    {pendingDeliveries.map((d) => (
                      <DeliveryCard
                        key={d.id}
                        delivery={d}
                        locale={dateLocale}
                        onStatusChange={handleStatusChange}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-secondary py-4 text-center">
                  {deliverySearch.trim() ? "No matches found" : t("session.no_pending")}
                </p>
              )}
            </div>

            {/* History - delivered, returned, rescheduled */}
            {(deliveredDeliveries.length > 0 || returnedDeliveries.length > 0 || rescheduledDeliveries.length > 0) && (
              <div className="mt-4 space-y-2">
                {/* Delivered */}
                {deliveredDeliveries.length > 0 && (
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                      {t("session.delivered_section")} ({deliveredDeliveries.length})
                    </p>
                    <div className="space-y-2">
                      {deliveredDeliveries.map((d) => (
                        <DeliveryCard
                          key={d.id}
                          delivery={d}
                          locale={dateLocale}
                          onStatusChange={handleStatusChange}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Returned (collapsible) */}
                {returnedDeliveries.length > 0 && (
                  <div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setReturnedExpanded(!returnedExpanded)}
                      className="w-full flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl px-4 py-2.5"
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                        {t("session.returned_section")} ({returnedDeliveries.length})
                      </span>
                      <motion.svg
                        animate={{ rotate: returnedExpanded ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="h-4 w-4 text-orange-500 shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </motion.button>
                    <AnimatePresence initial={false}>
                      {returnedExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3">
                            {returnedDeliveries.map((d) => (
                              <DeliveryCard
                                key={d.id}
                                delivery={d}
                                locale={dateLocale}
                                onStatusChange={handleStatusChange}
                                t={t}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Rescheduled (collapsible) */}
                {rescheduledDeliveries.length > 0 && (
                  <div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRescheduledExpanded(!rescheduledExpanded)}
                      className="w-full flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl px-4 py-2.5"
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                        {t("session.rescheduled_section")} ({rescheduledDeliveries.length})
                      </span>
                      <motion.svg
                        animate={{ rotate: rescheduledExpanded ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="h-4 w-4 text-purple-500 shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </motion.button>
                    <AnimatePresence initial={false}>
                      {rescheduledExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3">
                            {rescheduledDeliveries.map((d) => (
                              <DeliveryCard
                                key={d.id}
                                delivery={d}
                                locale={dateLocale}
                                onStatusChange={handleStatusChange}
                                t={t}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Map Section — collapsible */}
        {mapCustomers.length > 0 ? (
          <div className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMapExpanded(!mapExpanded)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-primary">
                    {t("session.map_title")}
                  </p>
                  <p className="text-[11px] font-medium text-secondary">
                    {mapCustomers.length} customers on route
                  </p>
                </div>
              </div>
              <motion.svg
                animate={{ rotate: mapExpanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="h-5 w-5 text-secondary shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </motion.button>
            <motion.div
              initial={false}
              animate={{ height: mapExpanded ? 700 : 0, opacity: mapExpanded ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="h-[700px] border-t border-card-border">
                <MapClientWrapper
                  customers={mapCustomers as any}
                  clusters={[]}
                />
              </div>
            </motion.div>
          </div>
        ) : sessionData.deliveries.length > 0 ? (
          <div className="rounded-[24px] bg-card border border-card-border p-8 text-center">
            <p className="text-[13px] font-medium text-secondary">
              {t("session.map_empty")}
            </p>
          </div>
        ) : null}
      </main>

      {/* Add Incoming Modal */}
      <AnimatePresence>
        {showIncomingModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowIncomingModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-lg bg-card rounded-t-[32px] sm:rounded-[32px] p-6 pb-24 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl"
            >
              <h2 className="text-xl font-extrabold text-primary mb-2">
                {t("session.incoming_title")}
              </h2>
              <p className="text-[13px] font-medium text-secondary mb-6">
                {t("session.incoming_desc")}
              </p>

              {/* Packages Count Input */}
              <div className="mb-5">
                <label className="text-[12px] font-black uppercase tracking-widest text-secondary mb-2 block">
                  {t("session.incoming_packages_label")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={packagesCount}
                  onChange={(e) => {
                    setPackagesCount(e.target.value);
                    setCustomerAssignments({});
                  }}
                  placeholder={t("session.incoming_packages_placeholder")}
                  className="w-full rounded-full bg-surface-hover px-5 py-3 text-[15px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Customer Selection */}
              {packagesCount && Number(packagesCount) > 0 && (
                <div className="mb-4">
                  <p className="text-[12px] font-black uppercase tracking-widest text-secondary mb-2">
                    {t("session.select_customers")}
                  </p>
                  <p className="text-[11px] font-medium text-secondary mb-3">
                    {t("session.select_customers_desc").replace("[N]", packagesCount)}
                  </p>

                  {/* Search */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customers..."
                      className="w-full rounded-full bg-surface-hover pl-10 pr-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                    />
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-[13px] text-secondary py-4 text-center">
                        {customerSearch ? "No customers match your search" : "No customers available"}
                      </p>
                    ) : (
                      filteredCustomers.map((c) => {
                        const qty = customerAssignments[c.id] || 0;
                        const maxed = Object.values(customerAssignments).reduce((s, v) => s + v, 0) >= Number(packagesCount);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-hover"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-secondary border border-card-border text-[12px] font-black">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-primary truncate">
                                {c.name}
                              </p>
                              {c.phoneNumber && (
                                <p className="text-[11px] font-medium text-secondary truncate">
                                  {c.phoneNumber}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                disabled={qty === 0}
                                onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: Math.max(0, qty - 1) }))}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-primary font-black text-lg disabled:opacity-30 border border-card-border active:scale-90"
                              >
                                –
                              </motion.button>
                              <span className="w-6 text-center text-[15px] font-black text-primary">{qty}</span>
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                disabled={maxed}
                                onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: qty + 1 }))}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-lg disabled:opacity-30 active:scale-90"
                              >
                                +
                              </motion.button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-[11px] font-medium text-secondary">
                      {t("session.total")}
                    </span>
                    <span className={`text-[15px] font-black ${Object.values(customerAssignments).reduce((s, v) => s + v, 0) === Number(packagesCount) ? 'text-emerald-600' : 'text-primary'}`}>
                      {Object.values(customerAssignments).reduce((s, v) => s + v, 0)}/{packagesCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowIncomingModal(false)}
                  className="btn-outline flex-1"
                >
                  {t("action.cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddIncoming}
                  disabled={savingIncoming || Object.values(customerAssignments).reduce((s, v) => s + v, 0) !== Number(packagesCount)}
                  className="btn-primary flex-1"
                >
                  {savingIncoming ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    t("action.save")
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Split Modal */}
      <AnimatePresence>
        {splitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSplitModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-sm bg-card rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg">
                  📦
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-primary">
                    {t("session.split_title").replace("[STATUS]", splitModal.targetStatus)}
                  </h3>
                  <p className="text-[12px] font-medium text-secondary mt-0.5">
                    {splitModal.customerName}
                  </p>
                </div>
              </div>

              <p className="text-[13px] font-medium text-secondary mb-5">
                {t("session.split_desc").replace("[N]", String(splitModal.currentPackages))}
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  disabled={splitModal.splitCount <= 0}
                  onClick={() => setSplitModal(prev => prev ? { ...prev, splitCount: Math.max(0, prev.splitCount - 1) } : null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-primary font-black text-xl disabled:opacity-30 border border-card-border active:scale-90"
                >
                  –
                </motion.button>
                <div className="text-center">
                  <p className="text-[32px] font-black text-primary">{splitModal.splitCount}</p>
                  <p className="text-[10px] font-medium text-secondary uppercase tracking-widest">
                    {t("session.quantity")}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  disabled={splitModal.splitCount >= splitModal.currentPackages}
                  onClick={() => setSplitModal(prev => prev ? { ...prev, splitCount: Math.min(prev.currentPackages, prev.splitCount + 1) } : null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-xl disabled:opacity-30 active:scale-90"
                >
                  +
                </motion.button>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSplitModal(null)}
                  className="btn-outline flex-1"
                >
                  {t("action.cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={confirmSplit}
                  disabled={splitModal.splitCount <= 0}
                  className="btn-primary flex-1"
                >
                  {t("session.split_confirm")}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeliveryCard({
  delivery,
  locale,
  onStatusChange,
  t,
}: {
  delivery: Delivery;
  locale: string;
  onStatusChange: (id: string, status: string) => void;
  t: (key: string) => string;
}) {
  const pkgCount = Number(delivery.packages) || 1;
  const statusColors: Record<string, string> = {
    pending: "border-l-4 border-l-blue-500",
    delivered: "border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20",
    returned: "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20",
    rescheduled: "border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/20",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`rounded-[16px] bg-card border border-card-border p-4 shadow-sm ${statusColors[delivery.status] || ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[13px] font-black">
            {delivery.customer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-primary truncate">
              {delivery.customer.name}
              {pkgCount > 1 && (
                <span className="ml-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300">
                  ×{pkgCount}
                </span>
              )}
            </p>
            {delivery.customer.address && (
              <p className="text-[11px] text-secondary truncate">
                {delivery.customer.address}
              </p>
            )}
          </div>
        </div>

        {delivery.status === "pending" && (
          <div className="flex gap-1.5 shrink-0">
            <StatusButton
              label={t("session.done")}
              status="delivered"
              color="emerald"
              onClick={() => onStatusChange(delivery.id, "delivered")}
            />
            <StatusButton
              label={t("session.return")}
              status="returned"
              color="orange"
              onClick={() => onStatusChange(delivery.id, "returned")}
            />
            <StatusButton
              label={t("session.reschedule")}
              status="rescheduled"
              color="purple"
              onClick={() => onStatusChange(delivery.id, "rescheduled")}
            />
          </div>
        )}
        {delivery.status !== "pending" && (
          <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
            delivery.status === "delivered" ? "text-emerald-600 dark:text-emerald-400" :
            delivery.status === "returned" ? "text-orange-600 dark:text-orange-400" :
            "text-purple-600 dark:text-purple-400"
          }`}>
            {delivery.status}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function StatusButton({
  label,
  status,
  color,
  onClick,
}: {
  label: string;
  status: string;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/50",
    orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 border-orange-200 dark:border-orange-800/50",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800/50",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all active:scale-90 ${colorMap[color] || ""}`}
    >
      {label}
    </motion.button>
  );
}
