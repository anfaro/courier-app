"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface Customer {
  id: string;
  name: string;
  phoneNumber?: string;
  address?: string;
}

export default function QuickAddCustomer({
  show,
  onClose,
  onCustomerCreated,
}: {
  show: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phone.trim(),
          address: address.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCustomerCreated(data.customer);
        setName(""); setPhone(""); setAddress("");
        onClose();
      } else {
        const err = await res.json();
        setError(err.message || err.error || "Failed to create customer");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(""); setPhone(""); setAddress(""); setError("");
    onClose();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, maxHeight: 0 }}
          animate={{ opacity: 1, maxHeight: 600 }}
          exit={{ opacity: 0, maxHeight: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="overflow-hidden mb-4"
        >
          <div className="rounded-[20px] bg-surface-hover border border-card-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-widest text-secondary">Quick Add</p>
              <button
                onClick={handleCancel}
                className="h-6 w-6 rounded-full bg-surface-hover flex items-center justify-center text-secondary active:scale-90 border border-card-border"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Customer name *"
              className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
            />
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
            />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full rounded-full bg-card px-4 py-2.5 text-[13px] font-bold text-primary outline-none ring-1 ring-transparent focus:ring-blue-500/30 transition-all"
            />
            {error && (
              <p className="text-[11px] font-bold text-red-500">{error}</p>
            )}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCancel}
                className="btn-outline flex-1 py-2 text-[12px]"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={saving || !name.trim()}
                onClick={handleSave}
                className="btn-primary flex-1 py-2 text-[12px]"
              >
                {saving ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : "Save"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
