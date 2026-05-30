"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastProvider";
import { useLanguage } from "@/components/LanguageProvider";

interface Visit {
  id: string;
  customerId: string;
  userId: string;
  userName: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  notes: string | null;
  createdAt: string;
}

export default function VisitsManager({ customerId }: { customerId: string }) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/visits`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
        const open = (data.visits || []).find((v: Visit) => !v.checkOutAt);
        setActiveVisit(open || null);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    if (!activeVisit) { setElapsed(""); return; }
    const start = new Date(activeVisit.checkInAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: checkInNotes || undefined }),
      });
      if (res.ok) {
        showToast(t("visit.checked_in") || "Checked in!", "success");
        setCheckInNotes("");
        setShowCheckInForm(false);
        await fetchVisits();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to check in", "error");
      }
    } catch {
      showToast("Failed to check in", "error");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeVisit) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/visits/${activeVisit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast(t("visit.checked_out") || "Checked out!", "success");
        await fetchVisits();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to check out", "error");
      }
    } catch {
      showToast("Failed to check out", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (checkIn: string, checkOut: string) => {
    const diff = Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="rounded-[2.5rem] border border-card-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[18px] font-extrabold text-primary">{t("visit.title") || "Visits"}</h2>
        {!activeVisit && !isLoading && (
          <button
            onClick={() => setShowCheckInForm(!showCheckInForm)}
            className="btn-primary !h-10 !rounded-full !px-5 !text-[13px]"
          >
            {t("visit.check_in") || "Check In"}
          </button>
        )}
      </div>

      {activeVisit && (
        <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {t("visit.active") || "Active Visit"}
              </p>
              <p className="mt-1 text-[13px] font-medium text-emerald-800 dark:text-emerald-300">
                {activeVisit.userName || "Unknown"} &middot; {formatDateTime(activeVisit.checkInAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[22px] font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                {elapsed}
              </p>
              <button
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-90 disabled:bg-emerald-400"
              >
                {isCheckingOut ? "..." : t("visit.check_out") || "Check Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckInForm && (
        <div className="mb-6 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/30 p-5">
          <textarea
            value={checkInNotes}
            onChange={(e) => setCheckInNotes(e.target.value)}
            placeholder={t("visit.notes_placeholder") || "Add notes (optional)..."}
            rows={2}
            className="w-full rounded-xl border border-blue-100 dark:border-blue-900/50 bg-card/60 px-4 py-3 text-[14px] font-medium text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="rounded-full bg-blue-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-90 disabled:bg-blue-400"
            >
              {isCheckingIn ? "..." : t("visit.confirm_check_in") || "Start Visit"}
            </button>
            <button
              onClick={() => { setShowCheckInForm(false); setCheckInNotes(""); }}
              className="rounded-full bg-surface-hover px-5 py-2 text-[13px] font-bold text-secondary transition hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-90"
            >
              {t("action.cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : visits.length === 0 ? (
        <p className="py-6 text-center text-[15px] font-medium text-secondary">
          {t("visit.no_visits") || "No visits recorded yet"}
        </p>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-card-border">
          {visits.map((visit) => (
            <div key={visit.id} className="relative">
              <div className={`absolute -left-[19px] top-1.5 h-3 w-3 rounded-full border-2 border-card ring-4 ${
                visit.checkOutAt
                  ? "bg-emerald-500 ring-emerald-500/10"
                  : "bg-blue-500 ring-blue-500/10"
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-black text-primary leading-none">
                    {visit.checkOutAt
                      ? (t("visit.visit_completed") || "Visit Completed")
                      : (t("visit.visit_in_progress") || "In Progress")}
                  </p>
                  {visit.checkOutAt && (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {formatDuration(visit.checkInAt, visit.checkOutAt)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] font-medium text-secondary">
                  {visit.userName || "Unknown"} &middot; {formatDateTime(visit.checkInAt)}
                  {visit.checkOutAt && ` → ${formatDateTime(visit.checkOutAt)}`}
                </p>
                {visit.notes && (
                  <p className="mt-1.5 text-[13px] text-primary/70 italic">
                    &ldquo;{visit.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
