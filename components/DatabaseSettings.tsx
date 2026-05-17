// components/DatabaseSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export default function DatabaseSettings() {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    databaseUrl: "",
    host: "",
    port: "5432",
    database: "",
    user: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [useUrl, setUseUrl] = useState(true);

  useEffect(() => {
    fetchWithTimeout("/api/admin/system/settings", {}, 30000)
      .then((r) => r.json())
      .then((d) => {
        setForm({ databaseUrl: d.databaseUrl || "", host: d.host, port: d.port, database: d.database, user: d.user, password: "" });
        setHasPassword(d.hasPassword);
        if (!d.databaseUrl) setUseUrl(false);
      })
      .catch(() => showToast("Failed to load settings.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      if (useUrl) {
        payload.databaseUrl = form.databaseUrl;
      } else {
        payload.host = form.host;
        payload.port = form.port;
        payload.database = form.database;
        payload.user = form.user;
        if (form.password) payload.password = form.password;
      }
      const res = await fetch("/api/admin/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Settings saved.", "success");
        if (form.password) { setForm((p) => ({ ...p, password: "" })); setHasPassword(true); }
      } else {
        showToast(data.error || "Save failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-card-border bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-[13px] font-medium text-primary focus:border-blue-500 focus:outline-none placeholder:text-secondary";

  if (loading) {
    return (
      <div className="px-4 sm:px-6 mb-8">
        <h2 className="text-[14px] font-bold tracking-tight text-primary uppercase tracking-widest opacity-60 mb-4">Database Connection</h2>
        <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
          <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 mb-8">
      <h2 className="text-[14px] font-bold tracking-tight text-primary uppercase tracking-widest opacity-60 mb-4">Database Connection</h2>

      <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm space-y-5">
        <p className="text-[12px] text-secondary">Configure database connection. Changes take effect after server restart. Current values shown.</p>

        <div className="flex gap-2">
          <button onClick={() => setUseUrl(true)} className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${useUrl ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}>Connection String</button>
          <button onClick={() => setUseUrl(false)} className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${!useUrl ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}>Individual Fields</button>
        </div>

        {useUrl ? (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-secondary">DATABASE_URL</label>
            <input value={form.databaseUrl} onChange={(e) => setForm((p) => ({ ...p, databaseUrl: e.target.value }))} className={inputClass} placeholder="postgresql://user:pass@host:5432/db" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">Host</label>
              <input value={form.host} onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))} className={inputClass} placeholder="localhost" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">Port</label>
              <input value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))} className={inputClass} placeholder="5432" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">Database Name</label>
              <input value={form.database} onChange={(e) => setForm((p) => ({ ...p, database: e.target.value }))} className={inputClass} placeholder="my_database" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">User</label>
              <input value={form.user} onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))} className={inputClass} placeholder="postgres" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className={inputClass} placeholder={hasPassword ? "•••••• (leave blank to keep)" : "Enter password"} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-secondary/60">⚠️ Server restart required for changes to take effect.</p>
          <button onClick={handleSave} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-2.5 text-[13px] font-bold text-white active:scale-90 transition-all disabled:opacity-40">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
