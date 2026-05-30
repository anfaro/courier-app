"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import ScannerModal from "@/components/ScannerModal";

interface Visit {
  id: string;
  customerId: string;
  userId: string | null;
  userName: string | null;
  visitedAt: string;
  checkedOutAt: string | null;
  notes: string | null;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDuration(visitedAt: string, checkedOutAt: string) {
  const ms = new Date(checkedOutAt).getTime() - new Date(visitedAt).getTime();
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return "<1m";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function VisitManager({ customerId }: { customerId: string }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/visits`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
        setActiveVisit(data.activeVisit || null);
      }
    } catch (err) {
      console.warn("Failed to fetch visits", err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    if (activeVisit) {
      setElapsed(Date.now() - new Date(activeVisit.visitedAt).getTime());
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - new Date(activeVisit.visitedAt).getTime());
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeVisit]);

  const checkIn = async () => {
    setIsRecording(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      if (res.ok) {
        showToast(t("customer.visit_recorded"), "success");
        setNotes("");
        setShowModal(false);
        fetchVisits();
      } else {
        showToast("Failed to check in", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setIsRecording(false);
    }
  };

  const checkOut = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await fetch(`/api/customers/${customerId}/visits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showToast(t("customer.checked_out"), "success");
        setActiveVisit(null);
        fetchVisits();
      } else {
        showToast("Failed to check out", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const lastVisit = visits[0];

  return (
    <>
    <div className="rounded-[2.5rem] bg-card p-6 sm:p-8 border border-card-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-secondary tracking-[0.2em]">
          {t("customer.visit_history")}
        </p>
        {!activeVisit && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-90"
          >
            {t("customer.check_in")}
          </button>
        )}
      </div>

      {activeVisit && (
        <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[14px] font-bold text-amber-800 dark:text-amber-300">
                {t("customer.checked_in")}
              </p>
            </div>
            <p className="text-[18px] font-black tabular-nums text-amber-700 dark:text-amber-400">
              {formatElapsed(elapsed)}
            </p>
          </div>
          <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400 mb-3">
            {formatDate(activeVisit.visitedAt)}
          </p>
          {activeVisit.notes && (
            <p className="text-[12px] text-amber-700 dark:text-amber-400 mb-3 italic">
              &ldquo;{activeVisit.notes}&rdquo;
            </p>
          )}
          <button
            onClick={checkOut}
            className="w-full rounded-full bg-red-600 py-3 text-[13px] font-bold text-white shadow-sm hover:bg-red-700 transition-all active:scale-90"
          >
            {t("customer.check_out")}
          </button>
        </div>
      )}

      {!activeVisit && lastVisit && (
        <div className="mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, mass: 0.8 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30"
          >
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <div>
            <p className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
              {t("customer.last_visited")}: {formatDate(lastVisit.visitedAt)}
            </p>
            {lastVisit.checkedOutAt && (
              <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                {t("customer.duration")}: {formatDuration(lastVisit.visitedAt, lastVisit.checkedOutAt)}
              </p>
            )}
            {lastVisit.userName && (
              <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                {t("customer.visited_by")} {lastVisit.userName}
              </p>
            )}
            {lastVisit.notes && (
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-1 italic">
                &ldquo;{lastVisit.notes}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      ) : visits.length === 0 ? (
        <div className="py-8 text-center">
          <span className="text-4xl block mb-2">📍</span>
          <p className="text-[14px] font-medium text-secondary">{t("customer.no_visits")}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {visits.map((v) => (
            <div key={v.id} className="flex items-start gap-3 p-3 rounded-2xl bg-surface-hover/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-sm font-black text-blue-700 dark:text-blue-400">
                {v.userName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-primary">{formatDate(v.visitedAt)}</span>
                  {v.userName && (
                    <span className="text-[11px] font-medium text-secondary">
                      {t("customer.visited_by")} {v.userName}
                    </span>
                  )}
                </div>
                {v.checkedOutAt && (
                  <p className="text-[11px] font-bold text-secondary/70 mt-0.5">
                    {t("customer.duration")}: {formatDuration(v.visitedAt, v.checkedOutAt)}
                  </p>
                )}
                {v.notes && (
                  <p className="text-[12px] text-secondary mt-0.5">{v.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-In Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[32px] bg-card p-6 shadow-2xl border border-card-border animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-primary mb-1">{t("customer.check_in")}</h3>
            <p className="text-[13px] text-secondary mb-5">{t("customer.visit_notes")}</p>

            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-secondary/50 resize-none pr-12"
                placeholder="Any notes about this visit..."
              />
              <button
                onClick={() => { setShowModal(false); setShowScanner(true); }}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-surface-hover hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors active:scale-90"
                title="Scan QR Code"
              >
                <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setNotes(""); }}
                className="flex-1 btn-outline"
              >
                {t("action.cancel")}
              </button>
              <button
                onClick={checkIn}
                disabled={isRecording}
                className="flex-[2] btn-primary"
              >
                {isRecording ? "..." : t("customer.check_in")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {showScanner && (
      <ScannerModal
        onScanSuccess={(text) => {
          setNotes(prev => prev ? `${prev}\n${text}` : text);
          setShowScanner(false);
          setShowModal(true);
        }}
        onClose={() => setShowScanner(false)}
      />
    )}
    </>
  );
}
