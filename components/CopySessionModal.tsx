"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";

interface CopyDelivery {
  customerId: string;
  customerName: string;
  packages: string;
}

interface CopyIncoming {
  id: string;
  time: string;
  packages: string;
  deliveries: CopyDelivery[];
}

interface RecentSession {
  id: string;
  date: string;
  totalPackages: string;
  finalized: boolean;
  incomings: CopyIncoming[];
}

interface CopySessionModalProps {
  show: boolean;
  onClose: () => void;
  onCopy: (assignments: Record<string, number>, customerNames: Record<string, string>) => void;
  t: (key: string) => string;
}

export default function CopySessionModal({ show, onClose, onCopy, t }: CopySessionModalProps) {
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useScrollLock(show);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    setError("");
    setExpandedId(null);
    fetch("/api/sessions/recent")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setError("Failed to load recent sessions"))
      .finally(() => setLoading(false));
  }, [show]);

  function handleUse(session: RecentSession) {
    const assignments: Record<string, number> = {};
    const customerNames: Record<string, string> = {};
    for (const inc of session.incomings) {
      for (const d of inc.deliveries) {
        const pkg = Number(d.packages) || 1;
        assignments[d.customerId] = (assignments[d.customerId] || 0) + pkg;
        customerNames[d.customerId] = d.customerName;
      }
    }
    onCopy(assignments, customerNames);
    onClose();
  }

  function uniqueCustomerCount(session: RecentSession): number {
    const ids = new Set<string>();
    for (const inc of session.incomings) {
      for (const d of inc.deliveries) {
        ids.add(d.customerId);
      }
    }
    return ids.size;
  }

  function getUniqueCustomers(session: RecentSession): { id: string; name: string; packages: number }[] {
    const map = new Map<string, { name: string; packages: number }>();
    for (const inc of session.incomings) {
      for (const d of inc.deliveries) {
        const existing = map.get(d.customerId);
        const pkg = Number(d.packages) || 1;
        if (existing) {
          existing.packages += pkg;
        } else {
          map.set(d.customerId, { name: d.customerName, packages: pkg });
        }
      }
    }
    return Array.from(map.entries()).map(([id, val]) => ({ id, name: val.name, packages: val.packages }));
  }

  const dateLocale = "id-ID";

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-card rounded-t-[32px] sm:rounded-[32px] p-6 pb-24 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl"
          >
            <h2 className="text-[20px] font-extrabold text-primary mb-2">
              {t("session.copy_modal_title")}
            </h2>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <span className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            )}

            {error && (
              <p className="text-[13px] font-medium text-red-500 text-center py-8">{error}</p>
            )}

            {!loading && !error && sessions.length === 0 && (
              <p className="text-[13px] font-medium text-secondary text-center py-8">
                {t("session.copy_no_sessions")}
              </p>
            )}

            {!loading && !error && sessions.length > 0 && (
              <div className="space-y-3 mt-4">
                {sessions.map((session) => {
                  const expanded = expandedId === session.id;
                  const customers = getUniqueCustomers(session);
                  return (
                    <motion.div
                      key={session.id}
                      layout
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="rounded-[20px] bg-surface-hover border border-card-border overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : session.id)}
                        className="w-full flex items-center gap-3 p-4 text-left active:scale-90 transition-transform"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <Icon name="calendar" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-primary">
                            {(() => {
                              const [y, m, d] = session.date.split("-").map(Number);
                              return new Date(y, m - 1, d).toLocaleDateString(dateLocale, {
                                weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Jakarta",
                              });
                            })()}
                          </p>
                          <p className="text-[11px] font-medium text-secondary">
                            {session.totalPackages} {t("session.packages")} · {customers.length} {t("session.customers")}
                          </p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUse(session);
                          }}
                          className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-[11px] font-black text-white uppercase tracking-widest active:scale-90"
                        >
                          {t("session.copy_use")}
                        </motion.button>
                      </button>

                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-1.5 border-t border-card-border pt-2">
                            {customers.map((c) => (
                              <div key={c.id} className="flex items-center justify-between">
                                <span className="text-[12px] font-medium text-primary truncate mr-2">
                                  {c.name}
                                </span>
                                <span className="text-[11px] font-black text-secondary shrink-0">
                                  ×{c.packages}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="btn-outline w-full"
              >
                {t("action.cancel")}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
