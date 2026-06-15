"use client";

import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface DateEditModalProps {
  show: boolean;
  onClose: () => void;
  editDate: string;
  setEditDate: (v: string) => void;
  sessionDate: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  showToast: (msg: string, type?: string) => void;
  fetchSession: () => void;
  sessionId: string;
  t: (key: string) => string;
}

export default function DateEditModal({
  show, onClose, editDate, setEditDate, sessionDate,
  saving, setSaving, showToast, fetchSession, sessionId, t,
}: DateEditModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
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
                onClick={onClose}
                className="btn-outline flex-1"
              >
                {t("action.cancel")}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={saving || !editDate || editDate === sessionDate}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/sessions/${sessionId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ date: editDate }),
                    });
                    if (res.ok) {
                      showToast(t("session.date_updated"), "success");
                      onClose();
                      fetchSession();
                    } else {
                      const err = await res.json();
                      showToast(err.message || "Failed to update date", "error");
                    }
                  } catch {
                    showToast("Failed to update date", "error");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="btn-primary flex-1"
              >
                {saving ? (
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
