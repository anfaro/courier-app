"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useScrollLock } from "@/lib/useScrollLock";
import IncomingModal from "@/components/IncomingModal";
import Icon from "@/components/Icon";

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
  packages: string;
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
  finalized: boolean;
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
  const [isFinalized, setIsFinalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [editingIncoming, setEditingIncoming] = useState<Incoming | null>(null);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [deliveredExpanded, setDeliveredExpanded] = useState(true);
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<"pending" | "returned" | "rescheduled">("pending");
  const [splitModal, setSplitModal] = useState<{
    deliveryId: string;
    customerName: string;
    currentPackages: number;
    targetStatus: string;
    splitCount: number;
    remainingDeliveryIds?: string[];
  } | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  useScrollLock(selectedDelivery !== null || splitModal !== null || showDateEdit);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
        setIsFinalized(data.finalized);
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

  async function handleDelete() {
    if (!canEdit) { showToast(t("session.finalized_blocked"), "warning"); return; }
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

  async function handleRemoveRescheduled(deliveryId: string) {
    if (!canEdit) { showToast(t("session.finalized_blocked"), "warning"); return; }
    const confirmed = await askConfirmation({
      title: t("session.remove_rescheduled_confirm_title"),
      message: t("session.remove_rescheduled_confirm_msg"),
      type: "danger",
      confirmText: t("action.delete"),
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/deliveries/${deliveryId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Delivery removed", "success");
        fetchSession();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to remove delivery", "error");
      }
    } catch {
      showToast("Failed to remove delivery", "error");
    }
  }

  async function handleStatusChange(deliveryId: string, newStatus: string) {
    const delivery = deliveryById.get(deliveryId);
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
    let lat: string | undefined;
    let lng: string | undefined;
    if (getGeocodeEnabled && newStatus === "delivered" && !delivery.customer.latitude && !delivery.customer.longitude) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude.toString();
        lng = pos.coords.longitude.toString();
      } catch {
        // Location unavailable or denied — proceed without it
      }
    }
    await doStatusChange(deliveryId, newStatus, undefined, lat, lng);
    fetchSession();
  }

  async function handleBulkStatusChange(customerId: string, newStatus: string) {
    const group = groupedByCustomer[customerId];
    if (!group) return;
    const total = group.totalPackages;
    if (total > 1) {
      setSplitModal({
        deliveryId: group.deliveries[0].id,
        customerName: group.customer.name,
        currentPackages: total,
        targetStatus: newStatus,
        splitCount: Math.ceil(total / 2),
        remainingDeliveryIds: group.deliveries.length > 1 ? group.deliveries.slice(1).map(d => d.id) : undefined,
      });
      return;
    }
    for (const d of group.deliveries) {
      await doStatusChange(d.id, newStatus);
    }
    fetchSession();
  }

  async function handleBulkRemove(customerId: string) {
    const group = groupedByCustomer[customerId];
    if (!group) return;
    const confirmed = await askConfirmation({
      title: t("session.remove_rescheduled_confirm_title"),
      message: t("session.remove_rescheduled_confirm_msg"),
      type: "danger",
      confirmText: t("action.delete"),
    });
    if (!confirmed) return;
    for (const d of group.deliveries) {
      try {
        await fetch(`/api/sessions/${sessionId}/deliveries/${d.id}`, { method: "DELETE" });
      } catch { /* continue */ }
    }
    showToast(t("session.rescheduled_removed"), "success");
    fetchSession();
  }

  async function doStatusChange(deliveryId: string, newStatus: string, splitCount?: number, latitude?: string, longitude?: string) {
    if (!canEdit) { showToast(t("session.finalized_blocked"), "warning"); return; }
    try {
      const body: any = { status: newStatus };
      if (splitCount) body.splitCount = splitCount;
      if (latitude && longitude) {
        body.latitude = latitude;
        body.longitude = longitude;
      }
      const res = await fetch(`/api/sessions/${sessionId}/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(t("session.delivery_updated"), "success");
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to update status", "error");
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  async function handleFinalize() {
    const confirmed = await askConfirmation({
      title: t("session.finalize_confirm_title"),
      message: t("session.finalize_confirm_msg"),
      type: "warning",
      confirmText: t("session.finalize"),
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalized: true }),
      });
      if (res.ok) {
        showToast("Session finalized", "success");
        fetchSession();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to finalize", "error");
      }
    } catch {
      showToast("Failed to finalize", "error");
    }
  }

  async function handleUnfinalize() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalized: false }),
      });
      if (res.ok) {
        showToast("Session unfinalized", "success");
        fetchSession();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to unfinalize", "error");
      }
    } catch {
      showToast("Failed to unfinalize", "error");
    }
  }

  async function confirmSplit() {
    if (!splitModal) return;
    let remaining = splitModal.splitCount;
    const markStatus = splitModal.targetStatus;
    const allIds = [splitModal.deliveryId, ...(splitModal.remainingDeliveryIds || [])];

    for (const id of allIds) {
      if (remaining <= 0) break;
      const del = deliveryById.get(id);
      const pkg = Number(del?.packages) || 1;
      const mark = Math.min(remaining, pkg);
      remaining -= mark;

      let lat: string | undefined;
      let lng: string | undefined;
      if (getGeocodeEnabled && markStatus === "delivered" && del && !del.customer.latitude && !del.customer.longitude) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
          });
          lat = pos.coords.latitude.toString();
          lng = pos.coords.longitude.toString();
        } catch {
          // Location unavailable — proceed without it
        }
      }

      if (mark < pkg) {
        await doStatusChange(id, markStatus, mark, lat, lng);
      } else {
        await doStatusChange(id, markStatus, undefined, lat, lng);
      }
    }
    fetchSession();
    setSplitModal(null);
  }

  const total = useMemo(() => Number(sessionData?.totalPackages ?? "0") || 0, [sessionData?.totalPackages]);
  const delivered = useMemo(() => Number(sessionData?.deliveredPackages ?? "0") || 0, [sessionData?.deliveredPackages]);
  const progress = useMemo(() => total > 0 ? Math.round((delivered / total) * 100) : 0, [total, delivered]);

  // Target metrics (recomputed on every render — cheap arithmetic)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const incomings = sessionData?.incomings ?? [];
  const deliveries = sessionData?.deliveries ?? [];

  const incomingTimeMap = useMemo(() => {
    const map: Record<string, string> = {};
    incomings.forEach((inc) => { map[inc.id] = inc.time; });
    return map;
  }, [incomings]);

  const earlyCutoff = useMemo(() => {
    const [ey, em, ed] = (sessionData?.date ?? "").split("-").map(Number);
    return new Date(Date.UTC(ey, em - 1, ed, 2, 0, 0));
  }, [sessionData?.date]);

  const earlyDeliveries = useMemo(() =>
    deliveries.filter((d) => {
      const t = incomingTimeMap[d.incomingId];
      return t && new Date(t) < earlyCutoff;
    }),
    [deliveries, incomingTimeMap, earlyCutoff]
  );

  const earlyTotal = useMemo(() => earlyDeliveries.reduce((s, d) => s + (Number(d.packages) || 1), 0), [earlyDeliveries]);
  const earlyDelivered = useMemo(() => earlyDeliveries.filter((d) => d.status === "delivered").reduce((s, d) => s + (Number(d.packages) || 1), 0), [earlyDeliveries]);
  const earlyPct = useMemo(() => earlyTotal > 0 ? Math.round((earlyDelivered / earlyTotal) * 100) : 0, [earlyTotal, earlyDelivered]);

  const isEarlyTarget = currentMinutes < 12 * 60;
  const activeTarget = isEarlyTarget ? 50 : currentMinutes < 20 * 60 ? 93 : 97;
  const activeSafe = isEarlyTarget ? null : 90;
  const activeLabel = isEarlyTarget ? "09:00" : currentMinutes < 20 * 60 ? "12:00" : "";
  const activeMetric = isEarlyTarget ? earlyPct : progress;
  const targetMet = activeMetric >= activeTarget;
  const inSafe = activeSafe !== null && activeMetric >= activeSafe;

  // Delivery filtering & grouping (memoized on data + search query)
  function groupByCustomer(deliveries: Delivery[]) {
    return Object.values(
      deliveries.reduce((acc, d) => {
        const cid = d.customerId;
        if (!acc[cid]) {
          acc[cid] = { customer: d.customer, deliveries: [], totalPackages: 0 };
        }
        acc[cid].deliveries.push(d);
        acc[cid].totalPackages += Number(d.packages) || 1;
        return acc;
      }, {} as Record<string, { customer: any; deliveries: Delivery[]; totalPackages: number }>)
    ).sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  }

  const filterBySearch = (d: Delivery) => {
    if (!deliverySearch.trim()) return true;
    const q = deliverySearch.toLowerCase();
    return d.customer.name.toLowerCase().includes(q) ||
      (d.customer.phoneNumber && d.customer.phoneNumber.includes(q)) ||
      (d.customer.address && d.customer.address.toLowerCase().includes(q)) ||
      d.status.toLowerCase().includes(q);
  };

  const pendingDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "pending" && filterBySearch(d)),
    [deliveries, deliverySearch]
  );
  const groupedByCustomer = useMemo(
    () => pendingDeliveries.reduce((acc, d) => {
      const cid = d.customerId;
      if (!acc[cid]) acc[cid] = { customer: d.customer, deliveries: [], totalPackages: 0 };
      acc[cid].deliveries.push(d);
      acc[cid].totalPackages += Number(d.packages) || 1;
      return acc;
    }, {} as Record<string, { customer: any; deliveries: Delivery[]; totalPackages: number }>),
    [pendingDeliveries]
  );
  const combinedCustomerList = useMemo(
    () => Object.values(groupedByCustomer).sort((a, b) => a.customer.name.localeCompare(b.customer.name)),
    [groupedByCustomer]
  );

  const deliveredDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "delivered" && filterBySearch(d)),
    [deliveries, deliverySearch]
  );
  const returnedDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "returned" && filterBySearch(d)),
    [deliveries, deliverySearch]
  );
  const rescheduledDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "rescheduled" && filterBySearch(d)),
    [deliveries, deliverySearch]
  );

  const combinedDeliveredList = useMemo(() => groupByCustomer(deliveredDeliveries), [deliveredDeliveries]);
  const combinedReturnedList = useMemo(() => groupByCustomer(returnedDeliveries), [returnedDeliveries]);
  const combinedRescheduledList = useMemo(() => groupByCustomer(rescheduledDeliveries), [rescheduledDeliveries]);

  const mapCustomers = useMemo(
    () => pendingDeliveries.map((d) => d.customer).filter((c) => c.latitude && c.longitude),
    [pendingDeliveries]
  );

  // Delivery lookup index for O(1) access
  const deliveryById = useMemo(() => {
    const map = new Map<string, Delivery>();
    deliveries.forEach((d) => map.set(d.id, d));
    return map;
  }, [deliveries]);

  const finalized = sessionData?.finalized ?? false;
  const isSuperAdmin = (authSession?.user as any)?.role === "superadmin";
  const canEdit = !isFinalized || isSuperAdmin;
  const showFinalized = finalized || isFinalized;
  const showTargetSystem = (authSession?.user as any)?.targetSystem !== false;
  const getGeocodeEnabled = (authSession?.user as any)?.getGeocode !== false;

  if (loading || !sessionData) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title={sessionId} />
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={`${sessionData.date} (${sessionId})`} />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              {(() => {
                const [y, m, d] = sessionData.date.split("-").map(Number);
                return new Date(y, m - 1, d).toLocaleDateString(dateLocale, {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
                });
              })()}
              {canEdit && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { setEditDate(sessionData.date); setShowDateEdit(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-secondary hover:text-blue-600 dark:hover:text-blue-400 border border-card-border active:scale-90"
                  aria-label={t("session.edit_date")}
                >
                  <Icon name="edit" size={14} />
                </motion.button>
              )}
            </h1>
            <p className="text-[13px] font-medium text-secondary mt-1">
              {total} {t("session.packages")} · {delivered} {t("session.delivered")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showFinalized ? (
              <>
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                  {t("session.finalized_badge")}
                </span>
                {isSuperAdmin && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleUnfinalize}
                    className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 text-[11px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest active:scale-90"
                  >
                    <Icon name="refresh" size={12} />
                    {t("session.unfinalize")}
                  </motion.button>
                )}
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleFinalize}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest active:scale-90"
              >
                <Icon name="check" size={12} />
                {t("session.finalize")}
              </motion.button>
            )}
          </div>
        </div>

        {/* Progress Bar with Targets */}
        <div className="rounded-[24px] bg-card border border-card-border p-6 shadow-sm">
          {/* Header with status pill */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-secondary uppercase tracking-widest">
              {t("session.progress")}
            </span>
            <span className={`text-[11px] font-black px-3 py-1 rounded-full ${
              showTargetSystem
                ? targetMet
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : inSafe
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-surface-hover text-secondary'
            }`}>
              {showTargetSystem
                ? targetMet
                  ? t("session.target_on_track")
                  : inSafe
                  ? t("session.target_safe")
                  : t("session.target_behind")
                : t("session.progress")}
            </span>
          </div>

          {/* Main bar — Overall progress */}
          <div className="mb-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-bold text-primary">Overall</span>
              <span className="text-[22px] font-black text-primary">{progress}%</span>
            </div>
            <div className="relative">
              <div className="h-4 w-full rounded-full bg-surface-hover overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`relative h-full rounded-full bg-gradient-to-r overflow-hidden ${
                    showTargetSystem
                      ? targetMet
                        ? 'from-emerald-400 to-emerald-500'
                        : inSafe
                        ? 'from-amber-400 to-amber-500'
                        : 'from-red-400 to-red-500'
                      : 'from-blue-400 to-blue-500'
                  }`}
                >
                  <div className="wave-surface" />
                  <div className="b0" />
                  <div className="b1" />
                  <div className="b2" />
                  <div className="b3" />
                  <div className="b4" />
                </motion.div>
              </div>
              {/* Target marker (after 12:00 on overall bar) */}
              {showTargetSystem && !isEarlyTarget && activeLabel && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${activeTarget}%` }}
                >
                  <div className="w-[1.5px] h-full bg-white/40 rounded-full absolute left-0 -translate-x-1/2" />
                  <span className="absolute top-0 left-[6px] text-[9px] font-black text-secondary/60 whitespace-nowrap leading-none mt-0.5">
                    {activeLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1 text-[11px] font-medium text-secondary">
              <span>0</span>
              <span>{total}</span>
            </div>
          </div>

          {/* Secondary bar — Before 09:00 early progress */}
          {showTargetSystem && (
          <div className="mt-5 pt-4 border-t border-card-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-bold text-secondary">{t("session.target_early")}</span>
              <span className="text-[14px] font-black text-primary">{earlyPct}%</span>
            </div>
            <div className="relative">
              <div className="h-2.5 w-full rounded-full bg-surface-hover overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${earlyPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="relative h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 overflow-hidden"
                >
                  <div className="wave-surface" />
                  <div className="b0" />
                  <div className="b1" />
                  <div className="b2" />
                  <div className="b3" />
                  <div className="b4" />
                </motion.div>
              </div>
              {/* Target marker (before 12:00 on early bar) */}
              {showTargetSystem && isEarlyTarget && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${activeTarget}%` }}
                >
                  <div className="w-[1.5px] h-full bg-white/40 rounded-full absolute left-0 -translate-x-1/2" />
                  <span className="absolute top-0 left-[6px] text-[9px] font-black text-secondary/60 whitespace-nowrap leading-none mt-0.5">
                    {activeLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1 text-[11px] font-medium text-secondary">
              <span>0</span>
              <span>{earlyTotal}</span>
            </div>
            <p className="text-[11px] font-medium text-secondary mt-1.5">
              {earlyTotal > 0
                ? `${t("session.target_early")}: ${earlyDelivered}/${earlyTotal} ${t("session.packages")}`
                : total > 0
                ? `${t("session.target_early")}: 0 ${t("session.packages")}`
                : `0 ${t("session.packages")}`}
            </p>
          </div>
          )}
        </div>

        {/* Add Incoming Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (isFinalized && !isSuperAdmin) {
              showToast(t("session.finalized_blocked"), "warning");
              return;
            }
            setShowIncomingModal(true);
          }}
          className="btn-primary w-full"
          style={{ display: isFinalized ? 'none' : '' }}
        >
          <Icon name="plus" size={20} />
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
                    <div className={`flex items-center justify-between`}>
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
                            hour: "2-digit", timeZone: "Asia/Jakarta",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: isFinalized ? 'none' : '' }}>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          if (isFinalized && !isSuperAdmin) return;
                          setEditingIncoming(inc);
                          setShowIncomingModal(true);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-hover text-secondary border border-card-border active:scale-90"
                      >
                        <Icon name="edit" size={14} />
                      </motion.button>
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
              <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-4 bg-surface-hover rounded-2xl p-1">
              {(["pending", "returned", "rescheduled"] as const).map((tab) => {
                const countMap = { pending: pendingDeliveries.length, returned: returnedDeliveries.length, rescheduled: rescheduledDeliveries.length };
                const colorMap = { pending: "text-blue-600 dark:text-blue-400", returned: "text-orange-600 dark:text-orange-400", rescheduled: "text-purple-600 dark:text-purple-400" };
                const labelMap = { pending: t("session.pending"), returned: t("session.returned_section"), rescheduled: t("session.rescheduled_section") };
                return (
                  <motion.button
                    key={tab}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveDeliveryTab(tab)}
                    className={`flex-1 rounded-2xl py-2.5 text-[12px] font-black uppercase tracking-wider transition-all ${
                      activeDeliveryTab === tab
                        ? 'bg-card shadow-sm text-primary'
                        : 'text-secondary/60 hover:text-secondary'
                    }`}
                  >
                    {labelMap[tab]}
                    <span className={`ml-1.5 ${activeDeliveryTab === tab ? colorMap[tab] : 'text-secondary/40'}`}>
                      {countMap[tab]}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Tab Content — fixed height to prevent layout jumping */}
            <div className="h-[450px]">
              {activeDeliveryTab === "pending" && (
                <div className="h-full rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 to-emerald-500">
                  <div className="h-full rounded-2xl bg-card">
                    {pendingDeliveries.length > 0 ? (
                      <div className="h-full overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                        {combinedCustomerList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          const first = group.deliveries[0];
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} dateLocale={dateLocale} sessionData={sessionData} t={t} onClick={!isCombined ? () => setSelectedDelivery(first) : undefined}>
                              <div className="flex gap-1.5 shrink-0">
                                <StatusButton
                                  label={t("session.done")}
                                  status="delivered"
                                  color="emerald"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "delivered") : handleStatusChange(first.id, "delivered")}
                                  disabled={!canEdit}
                                />
                                <StatusButton
                                  label={t("session.return")}
                                  status="returned"
                                  color="orange"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "returned") : handleStatusChange(first.id, "returned")}
                                  disabled={!canEdit}
                                />
                                <StatusButton
                                  label={t("session.reschedule")}
                                  status="rescheduled"
                                  color="purple"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "rescheduled") : handleStatusChange(first.id, "rescheduled")}
                                  disabled={!canEdit}
                                />
                              </div>
                            </CustomerGroupCard>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center p-6">
                        <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {deliverySearch.trim() ? "No matches found" : t("session.all_processed")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDeliveryTab === "returned" && (
                <div className="h-full rounded-2xl p-[2px] bg-gradient-to-r from-orange-500 to-red-500">
                  <div className="h-full rounded-2xl bg-card">
                    <div className="h-full overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                      {returnedDeliveries.length > 0 ? (
                        combinedReturnedList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} dateLocale={dateLocale} sessionData={sessionData} t={t}>
                              <span className="text-[10px] font-black uppercase tracking-wider shrink-0 text-orange-600 dark:text-orange-400">
                                {t("session.returned")}
                              </span>
                            </CustomerGroupCard>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-[13px] font-bold text-secondary">{t("session.all_processed")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeDeliveryTab === "rescheduled" && (
                <div className="h-full rounded-2xl p-[2px] bg-gradient-to-r from-purple-500 to-indigo-500">
                  <div className="h-full rounded-2xl bg-card">
                    <div className="h-full overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                      {rescheduledDeliveries.length > 0 ? (
                        combinedRescheduledList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          const first = group.deliveries[0];
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} dateLocale={dateLocale} sessionData={sessionData} t={t}>
                              <div className="flex gap-1.5 shrink-0">
                                <StatusButton
                                  label={t("session.done")}
                                  status="delivered"
                                  color="emerald"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "delivered") : handleStatusChange(first.id, "delivered")}
                                  disabled={!canEdit}
                                />
                                <StatusButton
                                  label={t("session.remove_rescheduled")}
                                  status="remove"
                                  color="red"
                                  onClick={() => isCombined ? handleBulkRemove(group.customer.id) : handleRemoveRescheduled(first.id)}
                                  disabled={!canEdit}
                                />
                              </div>
                            </CustomerGroupCard>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-[13px] font-bold text-secondary">{t("session.all_processed")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delivered section — collapsible */}
            {deliveredDeliveries.length > 0 && (
              <div className="mt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeliveredExpanded(!deliveredExpanded)}
                  className="w-full flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl px-4 py-2.5"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    {t("session.delivered_section")} ({deliveredDeliveries.length})
                  </span>
                  <motion.div
                    animate={{ rotate: deliveredExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="text-emerald-500 shrink-0"
                  >
                    <Icon name="chevron-down" size={16} />
                  </motion.div>
                </motion.button>
                <AnimatePresence initial={false}>
                  {deliveredExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-3">
                        {combinedDeliveredList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} dateLocale={dateLocale} sessionData={sessionData} t={t}>
                              <span className="text-[10px] font-black uppercase tracking-wider shrink-0 text-emerald-600 dark:text-emerald-400">
                                {t("session.delivered")}
                              </span>
                            </CustomerGroupCard>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  <Icon name="route" size={20} />
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
              <motion.div
                animate={{ rotate: mapExpanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-secondary shrink-0"
              >
                <Icon name="chevron-down" size={20} />
              </motion.div>
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

        {/* Delete Session */}
        <div className="pt-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            disabled={!canEdit}
            className="w-full rounded-full border-2 border-red-200 dark:border-red-900/50 px-5 py-3 text-[13px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest disabled:opacity-30 disabled:active:scale-100 active:scale-90"
          >
            <Icon name="trash" size={16} className="inline mr-2 -mt-0.5" />
            {t("session.delete_session")}
          </motion.button>
        </div>
      </main>

      <IncomingModal
        show={showIncomingModal}
        onClose={() => { setShowIncomingModal(false); setEditingIncoming(null); }}
        editingIncoming={editingIncoming}
        sessionId={sessionId}
        onSaved={fetchSession}
        canEdit={canEdit}
        isSuperAdmin={isSuperAdmin}
        t={t}
      />

      {/* Customer Details Popover */}
      <AnimatePresence>
        {selectedDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setSelectedDelivery(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.9 }}
              className="relative w-full max-w-sm bg-card rounded-[40px] overflow-hidden shadow-2xl border border-card-border"
            >
              {/* Hero Image */}
              <div className="relative h-52 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700">
                {selectedDelivery.customer.housePictureUrl ? (
                  <img
                    src={selectedDelivery.customer.housePictureUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[80px] font-black text-white/20 select-none">
                      {selectedDelivery.customer.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[22px] font-extrabold text-white drop-shadow-sm truncate">
                      {selectedDelivery.customer.name}
                    </p>
                    <p className="text-[13px] font-medium text-white/80 mt-0.5">
                      {(Number(selectedDelivery.packages) || 1)} {(Number(selectedDelivery.packages) || 1) > 1 ? "packages" : "package"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDelivery(null)}
                    className="shrink-0 ml-3 h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 hover:bg-white/30 transition-all"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-5 space-y-3">
                {selectedDelivery.customer.phoneNumber && (
                  <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Icon name="phone" size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Phone</p>
                      <p className="text-[14px] font-bold text-primary">{selectedDelivery.customer.phoneNumber}</p>
                    </div>
                  </div>
                )}
                {selectedDelivery.customer.address && (
                  <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Icon name="map-pin" size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Address</p>
                      <p className="text-[14px] font-bold text-primary">{selectedDelivery.customer.address}</p>
                    </div>
                  </div>
                )}
                {selectedDelivery.incoming?.time && (
                  <div className="flex items-center gap-3.5 rounded-2xl bg-surface-hover/60 px-4 py-3 border border-card-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <Icon name="clock" size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Incoming Time</p>
                      <p className="text-[14px] font-bold text-primary">
                        {new Date(selectedDelivery.incoming.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      </p>
                    </div>
                  </div>
                )}
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

      {/* Date Edit Modal */}
      <AnimatePresence>
        {showDateEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDateEdit(false)}
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
                  📅
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-primary">
                    {t("session.edit_date")}
                  </h3>
                </div>
              </div>

              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[15px] font-bold text-primary outline-none focus:border-blue-500 transition-all"
              />

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowDateEdit(false)}
                  className="btn-outline flex-1"
                >
                  {t("action.cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={savingDate || !editDate || editDate === sessionData.date}
                  onClick={async () => {
                    setSavingDate(true);
                    try {
                      const res = await fetch(`/api/sessions/${sessionId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ date: editDate }),
                      });
                      if (res.ok) {
                        showToast(t("session.date_updated"), "success");
                        setShowDateEdit(false);
                        fetchSession();
                      } else {
                        const err = await res.json();
                        showToast(err.message || "Failed to update date", "error");
                      }
                    } catch {
                      showToast("Failed to update date", "error");
                    } finally {
                      setSavingDate(false);
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  {savingDate ? (
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
    </div>
  );
}

function CustomerGroupCard({
  group,
  isCombined,
  dateLocale,
  sessionData,
  t,
  children,
  onClick,
}: {
  group: { customer: any; deliveries: Delivery[]; totalPackages: number };
  isCombined: boolean;
  dateLocale: string;
  sessionData: any;
  t: (key: string) => string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const firstPkg = group.deliveries[0]?.packages;
  const pkgCount = Number(firstPkg) || 1;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onClick={onClick}
      className={`rounded-[16px] bg-card border border-card-border p-4 shadow-sm mb-3 ${onClick ? 'cursor-pointer hover:bg-surface-hover transition-colors active:scale-90' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[13px] font-black">
            {group.customer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-primary truncate">
                {group.customer.name}
              </p>
              {!isCombined && pkgCount > 1 && (
                <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300">
                  ×{pkgCount}
                </span>
              )}
              {isCombined && (
                <span className="shrink-0 rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-[10px] font-black text-purple-700 dark:text-purple-300">
                  ×{group.totalPackages}
                </span>
              )}
            </div>
            {group.customer.address && (
              <p className="text-[11px] text-secondary truncate">
                {group.customer.address}
              </p>
            )}
            {isCombined && (
              <div className="flex items-center gap-1 mt-1">
                <Icon name="clock" size={10} strokeWidth={2.5} className="text-secondary/60" />
                <p className="text-[10px] font-medium text-secondary/60">
                  {group.deliveries.map((d: Delivery) => {
                    const inc = sessionData.incomings.find((i: any) => i.id === d.incomingId);
                    return inc ? new Date(inc.time).toLocaleTimeString(dateLocale, {
                      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
                    }) : "";
                  }).filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function DeliveryCard({
  delivery,
  locale,
  onStatusChange,
  onRemove,
  onSelect,
  t,
  disabled,
}: {
  delivery: Delivery;
  locale: string;
  onStatusChange: (id: string, status: string) => void;
  onRemove?: (id: string) => void;
  onSelect?: () => void;
  t: (key: string) => string;
  disabled?: boolean;
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
      onClick={onSelect}
      className={`rounded-[16px] bg-card border border-card-border p-4 shadow-sm ${statusColors[delivery.status] || ""} ${onSelect ? 'cursor-pointer hover:bg-surface-hover transition-colors active:scale-90' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[13px] font-black">
            {delivery.customer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-primary truncate">
                {delivery.customer.name}
              </p>
              {pkgCount > 1 && (
                <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300">
                  ×{pkgCount}
                </span>
              )}
            </div>
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
              disabled={disabled}
            />
            <StatusButton
              label={t("session.return")}
              status="returned"
              color="orange"
              onClick={() => onStatusChange(delivery.id, "returned")}
              disabled={disabled}
            />
            <StatusButton
              label={t("session.reschedule")}
              status="rescheduled"
              color="purple"
              onClick={() => onStatusChange(delivery.id, "rescheduled")}
              disabled={disabled}
            />
          </div>
        )}
        {delivery.status === "rescheduled" && (
          <div className="flex gap-1.5 shrink-0">
            <StatusButton
              label={t("session.done")}
              status="delivered"
              color="emerald"
              onClick={() => onStatusChange(delivery.id, "delivered")}
              disabled={disabled}
            />
            {onRemove && (
              <StatusButton
                label={t("session.remove_rescheduled")}
                status="remove"
                color="red"
                onClick={() => onRemove(delivery.id)}
                disabled={disabled}
              />
            )}
          </div>
        )}
        {delivery.status !== "pending" && delivery.status !== "rescheduled" && (
          <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
            delivery.status === "delivered" ? "text-emerald-600 dark:text-emerald-400" :
            "text-orange-600 dark:text-orange-400"
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
  disabled,
}: {
  label: string;
  status: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
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
      className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${colorMap[color] || ""} ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'active:scale-90'}`}
    >
      {label}
    </motion.button>
  );
}
