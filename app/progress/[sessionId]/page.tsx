"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import Link from "next/link";
import IncomingModal from "@/components/IncomingModal";
import DateEditModal from "@/components/DateEditModal";
import Icon from "@/components/Icon";

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
}

interface Delivery {
  id: string;
  sessionId: string;
  incomingId: string;
  customerId: string;
  packages: string;
  status: "pending" | "delivered" | "returned" | "rescheduled";
  customer: Customer;
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

export default function SessionDashboard() {
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
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);

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

  const total = useMemo(() => Number(sessionData?.totalPackages ?? "0") || 0, [sessionData?.totalPackages]);
  const delivered = useMemo(() => Number(sessionData?.deliveredPackages ?? "0") || 0, [sessionData?.deliveredPackages]);
  const progress = useMemo(() => total > 0 ? Math.round((delivered / total) * 100) : 0, [total, delivered]);

  const incomings = sessionData?.incomings ?? [];

  const incomingProgressMap = useMemo(() => {
    const map: Record<string, { total: number; delivered: number }> = {};
    incomings.forEach((inc) => {
      const incDeliveries = sessionData?.deliveries.filter(d => d.incomingId === inc.id) || [];
      const incTotal = incDeliveries.reduce((s, d) => s + (Number(d.packages) || 1), 0);
      const incDelivered = incDeliveries.filter(d => d.status === "delivered").reduce((s, d) => s + (Number(d.packages) || 1), 0);
      map[inc.id] = { total: incTotal, delivered: incDelivered };
    });
    return map;
  }, [incomings, sessionData?.deliveries]);

  const customerRanking = useMemo(() => {
    const deliveries = sessionData?.deliveries || [];
    const groups: Record<string, { customer: Customer; total: number; delivered: number }> = {};
    deliveries.forEach((d) => {
      if (!groups[d.customerId]) {
        groups[d.customerId] = { customer: d.customer, total: 0, delivered: 0 };
      }
      groups[d.customerId].total += Number(d.packages) || 1;
      if (d.status === "delivered") groups[d.customerId].delivered += Number(d.packages) || 1;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [sessionData?.deliveries]);

  const finalized = sessionData?.finalized ?? false;
  const isSuperAdmin = (authSession?.user as any)?.role === "superadmin";
  const canEdit = !isFinalized || isSuperAdmin;
  const showFinalized = finalized || isFinalized;
  const showTargetSystem = (authSession?.user as any)?.targetSystem !== false;

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

        {/* Overall Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="rounded-[24px] bg-card border border-card-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-secondary uppercase tracking-widest">
              {t("session.progress")}
            </span>
            <span className="text-[22px] font-black text-primary">{progress}%</span>
          </div>
          <div className="h-4 w-full rounded-full bg-surface-hover overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`relative h-full rounded-full bg-gradient-to-r overflow-hidden ${
                showTargetSystem
                  ? progress >= 97
                    ? 'from-emerald-400 to-emerald-500'
                    : progress >= 90
                    ? 'from-amber-400 to-amber-500'
                    : 'from-red-400 to-red-500'
                  : 'from-blue-400 to-blue-500'
              }`}
            >
              <div className="wave-surface" />
              <div className="b0" /><div className="b1" /><div className="b2" /><div className="b3" /><div className="b4" />
            </motion.div>
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] font-medium text-secondary">
            <span>0</span>
            <span>{total}</span>
          </div>
        </motion.div>

        {/* Customer Ranking */}
        {customerRanking.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
            className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-bold text-secondary uppercase tracking-widest">
                {t("session.top_customers")}
              </span>
              <span className="text-[11px] font-medium text-secondary">
                {customerRanking.length} {t("session.customers")}
              </span>
            </div>
            <div className="space-y-2">
              {customerRanking.map((item, i) => (
                <div key={item.customer.id} className="flex items-center gap-3">
                  <span className={`w-6 text-center text-[13px] font-black ${
                    i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-secondary'
                  }`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-primary truncate">{item.customer.name}</p>
                    <p className="text-[11px] font-medium text-secondary">
                      {item.delivered}/{item.total} {t("session.delivered")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-black text-primary">{item.total}</span>
                    <span className="text-[10px] font-medium text-secondary ml-1">{t("session.packages")}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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

        {/* Incoming Cards */}
        {incomings.length > 0 && (
          <div>
            <h2 className="text-[14px] font-bold tracking-tight text-primary mb-3">
              {t("session.incoming_list")}
            </h2>
            <div className="space-y-3">
              {incomings.map((inc, i) => {
                const incProgress = incomingProgressMap[inc.id];
                const incTotal = incProgress?.total || 0;
                const incDelivered = incProgress?.delivered || 0;
                const incPct = incTotal > 0 ? Math.round((incDelivered / incTotal) * 100) : 0;
                return (
                  <motion.div
                    key={inc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Link
                      href={`/progress/${sessionId}/${inc.id}`}
                      className="block rounded-[20px] bg-card border border-card-border p-4 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-90"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-lg">
                            🚛
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-primary">
                              {incTotal} {t("session.packages")} · {incDelivered} {t("session.delivered")}
                            </p>
                            <p className="text-[11px] font-medium text-secondary">
                              {new Date(inc.time).toLocaleTimeString(dateLocale, {
                                hour: "2-digit", timeZone: "Asia/Jakarta",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[15px] font-black ${
                            incPct === 100 ? 'text-emerald-500' : 'text-primary'
                          }`}>
                            {incPct}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${incPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            incPct === 100
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                              : incPct > 0
                              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                              : 'bg-surface-hover'
                          }`}
                        />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

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

      <DateEditModal
        show={showDateEdit}
        onClose={() => setShowDateEdit(false)}
        editDate={editDate}
        setEditDate={setEditDate}
        sessionDate={sessionData.date}
        saving={savingDate}
        setSaving={setSavingDate}
        showToast={showToast}
        fetchSession={fetchSession}
        sessionId={sessionId}
        t={t}
      />
    </div>
  );
}
