"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";
import { useToast } from "@/components/ToastProvider";
import Icon from "@/components/Icon";
interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

interface IncomingDelivery {
  id: string;
  customerId: string;
  packages: string;
  status: string;
}

interface Incoming {
  id: string;
  time: string;
  packages: string;
  deliveries?: IncomingDelivery[];
}

interface IncomingModalProps {
  show: boolean;
  onClose: () => void;
  editingIncoming: Incoming | null;
  sessionId: string;
  onSaved: () => void;
  canEdit: boolean;
  isSuperAdmin: boolean;
  t: (key: string) => string;
}

export default function IncomingModal({
  show, onClose, editingIncoming, sessionId, onSaved, canEdit, isSuperAdmin, t,
}: IncomingModalProps) {
  const { showToast } = useToast();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [customerAssignments, setCustomerAssignments] = useState<Record<string, number>>({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [incomingTime, setIncomingTime] = useState("");
  const [savingIncoming, setSavingIncoming] = useState(false);

  const DRAFT_KEY = `incoming-draft-${sessionId}`;
  const DRAFT_TTL = 30 * 60 * 1000;

  useScrollLock(show);

  // Save draft to sessionStorage on state changes
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          customerAssignments, customerSearch, showQuickAdd,
          quickName, quickPhone, quickAddress, incomingTime,
          editingIncomingId: editingIncoming?.id || null,
          timestamp: Date.now(),
        }));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [customerAssignments, customerSearch, showQuickAdd, quickName, quickPhone, quickAddress, incomingTime, editingIncoming, show, DRAFT_KEY]);

  // Restore draft on modal open
  useEffect(() => {
    if (!show) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Date.now() - draft.timestamp > DRAFT_TTL) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (draft.customerAssignments) setCustomerAssignments(draft.customerAssignments);
      if (draft.customerSearch) setCustomerSearch(draft.customerSearch);
      if (draft.showQuickAdd) setShowQuickAdd(true);
      if (draft.quickName) setQuickName(draft.quickName);
      if (draft.quickPhone) setQuickPhone(draft.quickPhone);
      if (draft.quickAddress) setQuickAddress(draft.quickAddress);
      if (draft.incomingTime) setIncomingTime(draft.incomingTime);
    } catch {}
  }, [show, DRAFT_KEY]);

  // Load customers lazily
  useEffect(() => {
    if (!show) return;
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
    if (allCustomers.length === 0) fetchCustomers();
    return () => { cancelled = true; };
  }, [show]);

  // Pre-populate when editing
  useEffect(() => {
    if (!show || !editingIncoming) return;
    const assignments: Record<string, number> = {};
    (editingIncoming.deliveries || []).forEach((d) => {
      if (d.status === "pending") {
        assignments[d.customerId] = (assignments[d.customerId] || 0) + Number(d.packages);
      }
    });
    if (Object.keys(assignments).length > 0) {
      setCustomerAssignments(assignments);
    }
    const d = new Date(editingIncoming.time);
    const localVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setIncomingTime(localVal);
  }, [show, editingIncoming]);

  // Reset on close
  useEffect(() => {
    if (!show) {
      setCustomerAssignments({});
      setIncomingTime("");
      setCustomerSearch("");
    }
  }, [show]);

  // Debounced server-side search
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

  const filteredCustomers = availableCustomers;

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }

  async function handleSave() {
    if (!canEdit) return;
    const assignments = Object.entries(customerAssignments)
      .filter(([_, qty]) => qty > 0)
      .map(([customerId, packages]) => ({ customerId, packages }));
    const count = assignments.reduce((sum, a) => sum + a.packages, 0);
    const isEdit = editingIncoming !== null;
    if (!isEdit && count < 1) return;

    setSavingIncoming(true);
    try {
      const url = isEdit
        ? `/api/sessions/${sessionId}/incomings/${editingIncoming!.id}`
        : `/api/sessions/${sessionId}/incomings`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packages: count,
          customerAssignments: assignments,
          ...(isEdit && incomingTime ? { time: new Date(incomingTime).toISOString() } : {}),
        }),
      });
      if (res.ok) {
        clearDraft();
        onClose();
        onSaved();
        showToast(t("session.incoming_saved").replace("[N]", String(count)), "success");
      }
    } catch {
      showToast(t("session.incoming_error"), "error");
    } finally {
      setSavingIncoming(false);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { clearDraft(); onClose(); }}
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

            {editingIncoming && isSuperAdmin && (
              <div className="mb-5">
                <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-1.5 block">
                  {t("session.incoming_time")}
                </label>
                <input
                  type="datetime-local"
                  value={incomingTime}
                  onChange={e => setIncomingTime(e.target.value)}
                  className="w-full rounded-full bg-surface-hover px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all [color-scheme:dark]"
                />
              </div>
            )}

            {/* Customer Selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-black uppercase tracking-widest text-secondary">
                  {t("session.select_customers")}
                </p>
                <div className="flex items-center gap-2">
                  {Object.values(customerAssignments).reduce((s, v) => s + v, 0) > 0 && (
                    <span className="text-[11px] font-medium text-secondary">
                      {Object.values(customerAssignments).reduce((s, v) => s + v, 0)} packages, {Object.keys(customerAssignments).filter(k => customerAssignments[k] > 0).length} customers
                    </span>
                  )}
                  {!showQuickAdd && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setShowQuickAdd(true); setQuickName(""); setQuickPhone(""); setQuickAddress(""); setQuickAddError(""); }}
                      className="text-[11px] font-black text-blue-600 dark:text-blue-400 active:scale-90"
                    >
                      + New
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Quick Add Form */}
              {showQuickAdd && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="rounded-[24px] bg-surface-hover border border-card-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-black uppercase tracking-widest text-secondary">Quick Add</p>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { setShowQuickAdd(false); setQuickAddError(""); }}
                        className="h-6 w-6 rounded-full bg-surface-hover flex items-center justify-center text-secondary active:scale-90 border border-card-border"
                      >
                        <Icon name="close" size={12} />
                      </motion.button>
                    </div>
                    <input
                      type="text"
                      value={quickName}
                      onChange={e => setQuickName(e.target.value)}
                      placeholder="Customer name *"
                      className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                    />
                    <input
                      type="text"
                      value={quickPhone}
                      onChange={e => setQuickPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                    />
                    <input
                      type="text"
                      value={quickAddress}
                      onChange={e => setQuickAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
                    />
                    {quickAddError && (
                      <p className="text-[11px] font-bold text-red-500">{quickAddError}</p>
                    )}
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowQuickAdd(false); setQuickAddError(""); }}
                        className="btn-outline flex-1 py-2 text-[12px]"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        disabled={quickAddSaving || !quickName.trim()}
                        onClick={async () => {
                          if (!quickName.trim()) return;
                          setQuickAddSaving(true);
                          setQuickAddError("");
                          try {
                            const res = await fetch("/api/customers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: quickName.trim(),
                                phoneNumber: quickPhone.trim(),
                                address: quickAddress.trim(),
                              }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              const newCustomer = data.customer;
                              setAvailableCustomers(prev => [newCustomer, ...prev]);
                              setCustomerAssignments(prev => ({ ...prev, [newCustomer.id]: 1 }));
                              setShowQuickAdd(false);
                            } else {
                              const err = await res.json();
                              setQuickAddError(err.message || err.error || "Failed to create customer");
                            }
                          } catch {
                            setQuickAddError("Network error");
                          } finally {
                            setQuickAddSaving(false);
                          }
                        }}
                        className="btn-primary flex-1 py-2 text-[12px]"
                      >
                        {quickAddSaving ? (
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : "Save"}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

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

              <div className="h-[400px] overflow-y-auto custom-scrollbar space-y-1">
                {filteredCustomers.length === 0 ? (
                  <p className="text-[13px] text-secondary py-4 text-center">
                    {customerSearch ? "No customers match your search" : "No customers available"}
                  </p>
                ) : (
                  filteredCustomers.map((c) => {
                    const qty = customerAssignments[c.id] || 0;
                    const checked = qty > 0;
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => {
                          if (checked) {
                            setCustomerAssignments(prev => ({ ...prev, [c.id]: 0 }));
                          } else {
                            setCustomerAssignments(prev => ({ ...prev, [c.id]: 1 }));
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-surface-hover active:scale-90 cursor-pointer transition-transform"
                      >
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 28 }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${
                            checked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-secondary/30 bg-transparent'
                          }`}
                        >
                          {checked && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            >
                              <Icon name="check" size={14} strokeWidth={3} />
                            </motion.div>
                          )}
                        </motion.div>

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
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 shrink-0"
                          >
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: Math.max(1, (prev[c.id] || 1) - 1) }))}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-primary font-black border border-card-border active:scale-90"
                            >
                              <Icon name="minus" size={12} />
                            </motion.button>
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
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setCustomerAssignments(prev => ({ ...prev, [c.id]: (prev[c.id] || 1) + 1 }))}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black active:scale-90"
                            >
                              <Icon name="plus" size={12} />
                            </motion.button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {Object.values(customerAssignments).reduce((s, v) => s + v, 0) > 0 && (
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[11px] font-medium text-secondary">{t("session.total")}</span>
                  <span className="text-[15px] font-black text-emerald-600">
                    {Object.values(customerAssignments).reduce((s, v) => s + v, 0)} packages
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { clearDraft(); onClose(); }}
                className="btn-outline flex-1"
              >
                {t("action.cancel")}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSave}
                disabled={savingIncoming || (editingIncoming === null && Object.values(customerAssignments).reduce((s, v) => s + v, 0) === 0) || !canEdit}
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
  );
}
