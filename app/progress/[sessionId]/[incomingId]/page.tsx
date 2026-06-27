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
import SplitModal from "@/components/SplitModal";
import QuickAddCustomer from "@/components/QuickAddCustomer";
import CustomerGroupCard from "@/components/CustomerGroupCard";
import StatusButton from "@/components/StatusButton";
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
}

interface SessionData {
  id: string;
  date: string;
  totalPackages: string;
  deliveredPackages: string;
  finalized: boolean;
}

export default function IncomingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const incomingId = params.incomingId as string;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();
  const { data: authSession } = useSession();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [editTime, setEditTime] = useState("");
  const [savingTime, setSavingTime] = useState(false);

  // Customer Add Section state
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerAssignments, setCustomerAssignments] = useState<Record<string, number>>({});
  const [showCustomerSnackbar, setShowCustomerSnackbar] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [addingDeliveries, setAddingDeliveries] = useState(false);
  const [pendingRemoveCustomerIds, setPendingRemoveCustomerIds] = useState<string[]>([]);

  useScrollLock(selectedDelivery !== null || splitModal !== null || showCustomerSnackbar);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, incomingRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/incomings/${incomingId}`),
      ]);
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setSessionData(session);
        setIsFinalized(session.finalized);
      } else {
        router.push("/progress");
        return;
      }
      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setIncoming(data.incoming);
        setDeliveries(data.deliveries || []);
      } else {
        router.push(`/progress/${sessionId}`);
      }
    } catch (err) {
      console.warn("Failed to fetch incoming", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, incomingId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load customers for add section
  useEffect(() => {
    let cancelled = false;
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers?limit=200&offset=0");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAllCustomers(data.customers || []);
        }
      } catch {}
    }
    fetchCustomers();
    return () => { cancelled = true; };
  }, []);

  // Debounced search for customer add
  useEffect(() => {
    if (!customerSearch.trim()) {
      setAvailableCustomers(allCustomers);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setAvailableCustomers(data);
            return;
          }
        }
      } catch {}
      const q = customerSearch.toLowerCase();
      setAvailableCustomers(allCustomers.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phoneNumber && c.phoneNumber.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      ));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, allCustomers]);

  async function handleDeleteIncoming() {
    if (!canEdit) { showToast(t("session.finalized_blocked"), "warning"); return; }
    const confirmed = await askConfirmation({
      title: t("session.delete_confirm_title"),
      message: t("session.delete_confirm_msg"),
      type: "danger",
      confirmText: t("action.delete"),
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/incomings/${incomingId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Incoming deleted", "success");
        router.push(`/progress/${sessionId}`);
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to delete incoming", "error");
      }
    } catch {
      showToast("Failed to delete incoming", "error");
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
        fetchData();
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
      } catch {}
    }
    await doStatusChange(deliveryId, newStatus, undefined, lat, lng);
    fetchData();
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
    fetchData();
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
      } catch {}
    }
    showToast(t("session.rescheduled_removed"), "success");
    fetchData();
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
        } catch {}
      }

      if (mark < pkg) {
        await doStatusChange(id, markStatus, mark, lat, lng);
      } else {
        await doStatusChange(id, markStatus, undefined, lat, lng);
      }
    }
    fetchData();
    setSplitModal(null);
  }

  async function handleAddDeliveries() {
    const assignments = Object.entries(customerAssignments)
      .filter(([_, qty]) => qty > 0)
      .map(([customerId, packages]) => ({ customerId, packages }));
    if (assignments.length === 0 && pendingRemoveCustomerIds.length === 0) return;
    setAddingDeliveries(true);
    try {
      let success = true;
      if (assignments.length > 0) {
        const res = await fetch(`/api/sessions/${sessionId}/incomings/${incomingId}/deliveries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerAssignments: assignments }),
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.message || "Failed to add deliveries", "error");
          success = false;
        }
      }
      if (success && pendingRemoveCustomerIds.length > 0) {
        const pendingDeliveries = deliveries.filter(
          d => pendingRemoveCustomerIds.includes(d.customerId) && d.status === "pending"
        );
        for (const d of pendingDeliveries) {
          try {
            const delRes = await fetch(`/api/sessions/${sessionId}/deliveries/${d.id}`, { method: "DELETE" });
            if (!delRes.ok) success = false;
          } catch { success = false; }
        }
      }
      if (success) {
        showToast(t("session.incoming_saved").replace("[N]", String(assignments.length)), "success");
        setCustomerAssignments({});
        setCustomerSearch("");
        setPendingRemoveCustomerIds([]);
        setShowCustomerSnackbar(false);
        fetchData();
      }
    } catch {
      showToast("Failed to add deliveries", "error");
    } finally {
      setAddingDeliveries(false);
    }
  }

  async function handleUpdateTime() {
    if (!editTime || !sessionData?.date) return;
    setSavingTime(true);
    try {
      const dateTimeStr = `${sessionData.date}T${editTime}:00+07:00`;
      const res = await fetch(`/api/sessions/${sessionId}/incomings/${incomingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: new Date(dateTimeStr).toISOString() }),
      });
      if (res.ok) {
        showToast("Incoming time updated", "success");
        setShowTimeEdit(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to update time", "error");
      }
    } catch {
      showToast("Failed to update time", "error");
    } finally {
      setSavingTime(false);
    }
  }

  function handleToggleRemovePending(customerId: string) {
    setPendingRemoveCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  }

  const total = useMemo(() => Number(incoming?.packages ?? "0") || 0, [incoming?.packages]);
  const deliveredCount = useMemo(
    () => deliveries.filter(d => d.status === "delivered").reduce((s, d) => s + (Number(d.packages) || 1), 0),
    [deliveries]
  );
  const progress = useMemo(() => total > 0 ? Math.round((deliveredCount / total) * 100) : 0, [total, deliveredCount]);

  // Filter by search
  const filterBySearch = (d: Delivery) => {
    if (!deliverySearch.trim()) return true;
    const q = deliverySearch.toLowerCase();
    return d.customer.name.toLowerCase().includes(q) ||
      (d.customer.phoneNumber && d.customer.phoneNumber.includes(q)) ||
      (d.customer.address && d.customer.address.toLowerCase().includes(q)) ||
      d.status.toLowerCase().includes(q);
  };

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
      }, {} as Record<string, { customer: Customer; deliveries: Delivery[]; totalPackages: number }>)
    ).sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  }

  const customerIdsWithPending = useMemo(
    () => new Set(deliveries.filter(d => d.status === "pending").map(d => d.customerId)),
    [deliveries]
  );

  const sessionDataProp = useMemo(() => ({
    incomings: incoming ? [{ id: incomingId, time: incoming.time, packages: incoming.packages }] : []
  }), [incomingId, incoming?.time, incoming?.packages]);

  const handleCustomerCreated = useCallback((newCustomer: Customer) => {
    setAvailableCustomers(prev => [newCustomer, ...prev]);
    setAllCustomers(prev => [...prev, newCustomer]);
    setCustomerAssignments(prev => ({ ...prev, [newCustomer.id]: 1 }));
  }, []);

  const pendingDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "pending" && filterBySearch(d)),
    [deliveries, deliverySearch]
  );
  const pendingPackagesCount = useMemo(
    () => pendingDeliveries.reduce((s, d) => s + (Number(d.packages) || 1), 0),
    [pendingDeliveries]
  );
  const groupedByCustomer = useMemo(
    () => pendingDeliveries.reduce((acc, d) => {
      const cid = d.customerId;
      if (!acc[cid]) acc[cid] = { customer: d.customer, deliveries: [], totalPackages: 0 };
      acc[cid].deliveries.push(d);
      acc[cid].totalPackages += Number(d.packages) || 1;
      return acc;
    }, {} as Record<string, { customer: Customer; deliveries: Delivery[]; totalPackages: number }>),
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

  const deliveryById = useMemo(() => {
    const map = new Map<string, Delivery>();
    deliveries.forEach((d) => map.set(d.id, d));
    return map;
  }, [deliveries]);

  const finalized = sessionData?.finalized ?? false;
  const isSuperAdmin = (authSession?.user as any)?.role === "superadmin";
  const canEdit = !isFinalized || isSuperAdmin;
  const getGeocodeEnabled = (authSession?.user as any)?.getGeocode !== false;

  if (loading || !incoming) {
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
      <PageHeader title={`${t("session.incoming_detail")} (${incomingId})`} />
      <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        {/* Incoming Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg">
              🚛
            </div>
            <div>
              <p className="text-[15px] font-bold text-primary">
                {t("session.incoming_title")}
              </p>
              <p className="text-[13px] font-medium text-secondary">
                {total} {t("session.packages")}
                {incoming.time && ` · ${new Date(incoming.time).toLocaleTimeString(dateLocale, {
                  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
                })}`}
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    const d = new Date(incoming.time);
                    const localVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setEditTime(localVal.split("T")[1].slice(0, 5));
                    setShowTimeEdit(true);
                  }}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-surface-hover text-secondary border border-card-border active:scale-90"
                >
                  <Icon name="edit" size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleDeleteIncoming}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-200 dark:border-red-800/50 active:scale-90"
                >
                  <Icon name="trash" size={14} />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
          className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-secondary uppercase tracking-widest">
              {t("session.incoming_progress")}
            </span>
            <span className="text-[20px] font-black text-primary">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-hover overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`relative h-full rounded-full bg-gradient-to-r overflow-hidden ${
                progress === 100
                  ? 'from-emerald-400 to-emerald-500'
                  : progress > 0
                  ? 'from-blue-400 to-blue-500'
                  : 'bg-surface-hover'
              }`}
            >
              <div className="wave-surface" />
              <div className="b0" /><div className="b1" /><div className="b2" /><div className="b3" /><div className="b4" />
            </motion.div>
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] font-medium text-secondary">
            <span>{t("session.delivered")}: {deliveredCount}</span>
            <span>{t("session.total")}: {total}</span>
          </div>
        </motion.div>

        {/* Select Customers moved to snackbar */}

        {/* Delivery List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold tracking-tight text-primary">
              {t("session.delivery_list")}
            </h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCustomerSnackbar(true)}
              className="text-[11px] font-black text-blue-600 dark:text-blue-400 active:scale-90"
            >
              + {t("session.add_edit_pending")}
            </motion.button>
          </div>
        </motion.div>

        {deliveries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.15 }}
          >
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
                const countMap = { pending: pendingPackagesCount, returned: returnedDeliveries.length, rescheduled: rescheduledDeliveries.length };
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

            {/* Tab Content */}
            <div>
              {activeDeliveryTab === "pending" && (
                <div className="max-h-[450px] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                  {pendingDeliveries.length > 0 ? (
                    <div className="p-1 space-y-1">
                      {combinedCustomerList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          const first = group.deliveries[0];
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} sessionData={sessionDataProp} status="pending" onClick={!isCombined ? () => setSelectedDelivery(first) : undefined}>
                              <div className="flex gap-2 w-full">
                                <StatusButton className="flex-1"
                                  label={t("session.done")}
                                  color="emerald"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "delivered") : handleStatusChange(first.id, "delivered")}
                                  disabled={!canEdit}
                                />
                                <StatusButton className="flex-1"
                                  label={t("session.return")}
                                  color="orange"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "returned") : handleStatusChange(first.id, "returned")}
                                  disabled={!canEdit}
                                />
                                <StatusButton className="flex-1"
                                  label={t("session.reschedule")}
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
                      <div className="flex items-center justify-center py-8">
                        <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {deliverySearch.trim() ? "No matches found" : t("session.all_processed")}
                        </p>
                      </div>
                    )}
                  </div>
              )}

              {activeDeliveryTab === "returned" && (
                <div className="max-h-[450px] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                  {returnedDeliveries.length > 0 ? (
                    <div className="p-1 space-y-1">
                      {combinedReturnedList.map((group) => {
                          const isCombined = group.deliveries.length > 1;
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} sessionData={sessionDataProp} status="returned">
                              <span className="text-[10px] font-black uppercase tracking-wider shrink-0 text-orange-600 dark:text-orange-400">
                                {t("session.returned")}
                              </span>
                            </CustomerGroupCard>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[13px] font-bold text-secondary">{t("session.all_processed")}</p>
                    </div>
                  )}
                </div>
              )}

              {activeDeliveryTab === "rescheduled" && (
                <div className="max-h-[450px] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]">
                  {rescheduledDeliveries.length > 0 ? (
                    <div className="p-1 space-y-1">
                      {combinedRescheduledList.map((group) => {
                        const isCombined = group.deliveries.length > 1;
                        const first = group.deliveries[0];
                          return (
                            <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} sessionData={sessionDataProp} status="rescheduled">
                              <div className="flex gap-2 w-full">
                                <StatusButton className="flex-1"
                                  label={t("session.done")}
                                  color="emerald"
                                  onClick={() => isCombined ? handleBulkStatusChange(group.customer.id, "delivered") : handleStatusChange(first.id, "delivered")}
                                  disabled={!canEdit}
                                />
                                <StatusButton className="flex-1"
                                  label={t("session.remove_rescheduled")}
                                  color="red"
                                  onClick={() => isCombined ? handleBulkRemove(group.customer.id) : handleRemoveRescheduled(first.id)}
                                  disabled={!canEdit}
                                />
                              </div>
                            </CustomerGroupCard>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[13px] font-bold text-secondary">{t("session.all_processed")}</p>
                    </div>
                  )}
                </div>
                )}
              </div>
          </motion.div>
        )}

        {deliveries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] bg-card border border-card-border p-8 text-center"
          >
            <p className="text-[13px] font-medium text-secondary">
              {t("session.incoming_empty")}
            </p>
          </motion.div>
        )}

        {/* Map Section */}
        {mapCustomers.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
            className="rounded-[24px] bg-card border border-card-border shadow-sm overflow-hidden"
          >
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
          </motion.div>
        ) : deliveries.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
            className="rounded-[24px] bg-card border border-card-border p-8 text-center"
          >
            <p className="text-[13px] font-medium text-secondary">
              {t("session.map_empty")}
            </p>
          </motion.div>
        ) : null}

        {/* Delivered section — collapsible (after map) */}
        {deliveredDeliveries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
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
                    initial={{ maxHeight: 0, opacity: 0 }}
                    animate={{ maxHeight: 2000, opacity: 1 }}
                    exit={{ maxHeight: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-3">
                      {combinedDeliveredList.map((group) => {
                        const isCombined = group.deliveries.length > 1;
                        return (
                          <CustomerGroupCard key={group.customer.id} group={group} isCombined={isCombined} sessionData={sessionDataProp} status="delivered">
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
          </motion.div>
        )}
      </main>

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
              <div className="relative h-52 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700">
                {selectedDelivery.customer.housePictureUrl ? (
                  <img src={selectedDelivery.customer.housePictureUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
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

      <SplitModal
        data={splitModal}
        onClose={() => setSplitModal(null)}
        onChange={setSplitModal as any}
        onConfirm={confirmSplit}
        t={t}
      />

      {/* Time Edit Modal */}
      <AnimatePresence>
        {showTimeEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowTimeEdit(false)}
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
                  🕐
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-primary">
                    {t("session.incoming_time")}
                  </h3>
                </div>
              </div>

              <p className="text-[12px] font-medium text-secondary mb-3">
                {sessionData?.date}
              </p>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[15px] font-bold text-primary outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
              />

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTimeEdit(false)}
                  className="btn-outline flex-1"
                >
                  {t("action.cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={savingTime || !editTime}
                  onClick={handleUpdateTime}
                  className="btn-primary flex-1"
                >
                  {savingTime ? (
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

      {/* Select Customers Snackbar */}
      <AnimatePresence>
        {showCustomerSnackbar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => { setShowCustomerSnackbar(false); setShowQuickAdd(false); }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto"
            >
              <div className="mx-auto max-w-3xl p-4">
                <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[12px] font-black uppercase tracking-widest text-secondary">
                      {t("session.select_customers")}
                    </span>
                    <div className="flex items-center gap-2">
                      {Object.values(customerAssignments).reduce((s, v) => s + v, 0) > 0 && (
                        <span className="text-[11px] font-medium text-secondary">
                          {Object.values(customerAssignments).reduce((s, v) => s + v, 0)} {t("session.packages")}
                        </span>
                      )}
                      {!showQuickAdd && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowQuickAdd(true)}
                          className="text-[11px] font-black text-blue-600 dark:text-blue-400 active:scale-90"
                        >
                          + New
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <QuickAddCustomer
                    show={showQuickAdd}
                    onClose={() => setShowQuickAdd(false)}
                    onCustomerCreated={handleCustomerCreated}
                  />

                  {/* Search */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customers..."
                      className="w-full rounded-full bg-surface-hover pl-10 pr-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                    />
                    <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                  </div>

                  {/* Customer List */}
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 mb-4">
                    {availableCustomers.length === 0 ? (
                      <p className="text-[13px] text-secondary py-4 text-center">
                        {customerSearch ? "No customers match your search" : "No customers available"}
                      </p>
                    ) : (
                      availableCustomers.map((c) => {
                        const qty = customerAssignments[c.id] || 0;
                        const checked = qty > 0;
                        const hasPending = customerIdsWithPending.has(c.id);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-hover active:scale-90 cursor-pointer transition-transform"
                            onClick={() => {
                              if (checked) {
                                setCustomerAssignments(prev => ({ ...prev, [c.id]: 0 }));
                              } else {
                                setCustomerAssignments(prev => ({ ...prev, [c.id]: 1 }));
                              }
                            }}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                              checked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-secondary/30 bg-transparent'
                            }`}>
                              {checked && (
                                <Icon name="check" size={14} strokeWidth={3} />
                              )}
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-secondary border border-card-border text-[12px] font-black">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-primary truncate">{c.name}</p>
                              <p className="text-[11px] font-medium text-secondary truncate">
                                {c.address || c.phoneNumber || ""}
                              </p>
                            </div>
                            {checked && (
                              <div onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: Math.max(1, (prev[c.id] || 1) - 1) }))}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-primary font-black border border-card-border active:scale-90"
                                >
                                  <Icon name="minus" size={12} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={qty}
                                  onChange={(e) => {
                                    const v = Math.max(1, parseInt(e.target.value) || 0);
                                    setCustomerAssignments(prev => ({ ...prev, [c.id]: v }));
                                  }}
                                  className="w-12 text-center text-[15px] font-black text-primary bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: (prev[c.id] || 1) + 1 }))}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black active:scale-90"
                                >
                                  <Icon name="plus" size={12} />
                                </button>
                              </div>
                            )}
                            {!checked && hasPending && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleRemovePending(c.id); }}
                                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border transition-all active:scale-90 ${
                                  pendingRemoveCustomerIds.includes(c.id)
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400 dark:border-red-500'
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-500 border-red-200 dark:border-red-800/50'
                                }`}
                              >
                                <Icon name="trash" size={10} />
                                {pendingRemoveCustomerIds.includes(c.id) && "will remove"}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {(Object.values(customerAssignments).reduce((s, v) => s + v, 0) > 0 || pendingRemoveCustomerIds.length > 0) && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddDeliveries}
                        disabled={addingDeliveries}
                        className="btn-primary flex-1"
                      >
                        {addingDeliveries ? (
                          <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <Icon name="plus" size={16} className="inline mr-1 -mt-0.5" />
                            {pendingRemoveCustomerIds.length > 0 ? t("session.save_changes") : t("session.add_customer")}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


