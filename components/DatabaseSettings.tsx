"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { useConfirmation } from "@/components/ConfirmationProvider";
import { AnimatePresence, motion } from "framer-motion";
import { useScrollLock } from "@/lib/useScrollLock";

interface DbProfile {
  name: string;
  config: Record<string, string>;
  updatedAt: string;
}

export default function DatabaseSettings() {
  const { showToast } = useToast();
  const { askConfirmation } = useConfirmation();

  const [form, setForm] = useState({
    databaseUrl: "",
    host: "",
    port: "5432",
    database: "",
    user: "",
    password: "",
    ssl: "require",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [useUrl, setUseUrl] = useState(true);
  const [status, setStatus] = useState<{
    connected: boolean;
    usingConfigFile: boolean;
    source: string;
    host: string;
    database: string;
    user: string;
    profiles: DbProfile[];
  } | null>(null);

  // Profile state
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  useScrollLock(showProfileDialog);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system/database/config")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        setHasPassword(d.hasPassword);
        setProfiles(d.profiles || []);
        if (d.host) {
          setForm((p) => ({
            ...p,
            host: d.host || "",
            database: d.database || "",
            user: d.user || "",
            ssl: d.ssl || "require",
          }));
          setUseUrl(false);
        } else {
          setForm((p) => ({ ...p, ssl: d.ssl || "require" }));
        }
        if (d.usingConfigFile) {
          setForm((p) => ({ ...p, databaseUrl: "" }));
        }
      })
      .catch(() => showToast("Failed to load connection status.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const buildPayload = () => {
    if (useUrl) {
      return { databaseUrl: form.databaseUrl, ssl: form.ssl };
    }
    const payload: Record<string, string> = {
      host: form.host,
      port: form.port,
      database: form.database,
      user: form.user,
      ssl: form.ssl,
    };
    if (form.password) payload.password = form.password;
    return payload;
  };

  const handleSave = async (saveAsProfile?: string) => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (useUrl && !form.databaseUrl) {
        showToast("Connection string is required.", "error");
        setSaving(false);
        return;
      }
      if (!useUrl && (!form.host || !form.database)) {
        showToast("Host and database name are required.", "error");
        setSaving(false);
        return;
      }

      if (saveAsProfile) {
        payload.profileName = saveAsProfile;
      }

      const res = await fetch("/api/admin/system/database/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(saveAsProfile ? `Connected & saved as "${saveAsProfile}".` : "Connection updated and hot-reloaded!", "success");
        setStatus(data.status);
        setProfiles(data.status?.profiles || []);
        if (form.password) setForm((p) => ({ ...p, password: "" }));
      } else {
        showToast(data.error || "Save failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      showToast("Profile name is required.", "error");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/system/database/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveToProfiles: true,
          name: profileName.trim(),
          config: buildPayload(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Profile "${profileName.trim()}" saved.`, "success");
        setProfiles((prev) => {
          const updated = [...prev.filter((p) => p.name !== profileName.trim())];
          updated.push({
            name: profileName.trim(),
            config: buildPayload(),
            updatedAt: new Date().toISOString(),
          });
          return updated;
        });
        setShowProfileDialog(false);
        setProfileName("");
      } else {
        showToast(data.error || "Failed to save profile.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApplyProfile = async (name: string) => {
    try {
      const res = await fetch("/api/admin/system/database/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyProfile: true, name }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Connected using "${name}".`, "success");
        setStatus(data.status);
      } else {
        showToast(data.error || "Failed to apply profile.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  const handleDeleteProfile = async (name: string) => {
    const confirmed = await askConfirmation({
      title: "Delete Profile",
      message: `Delete "${name}"?`,
      confirmText: "Delete",
      type: "warning",
    });
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/system/database/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        showToast(`Profile "${name}" deleted.`, "success");
        setProfiles((prev) => prev.filter((p) => p.name !== name));
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete profile.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    }
  };

  const handleReset = async () => {
    const confirmed = await askConfirmation({
      title: "Reset to env var",
      message: "This will delete the config file and switch back to DATABASE_URL from your environment. Connection will hot-reload.",
      confirmText: "Reset",
      type: "warning",
    });
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/system/database/config", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Reset to DATABASE_URL. Connection hot-reloaded.", "success");
        setStatus(data.status);
        setProfiles(data.status?.profiles || []);
        setForm({ databaseUrl: "", host: "", port: "5432", database: "", user: "", password: "" });
        setUseUrl(true);
      } else {
        showToast(data.error || "Reset failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setResetting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-card-border bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-[13px] font-medium text-primary focus:border-blue-500 focus:outline-none placeholder:text-secondary";

  if (loading) {
    return (
      <div>
        <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
          <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Connection form */}
      <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm space-y-5">

        {/* Status indicator */}
        <div className="rounded-2xl bg-surface-hover p-4 flex items-center gap-4">
          <div className={`h-3 w-3 rounded-full shrink-0 ${status?.connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"}`} />
          <div className="min-w-0">
            <p className="font-bold text-primary text-[13px]">
              {status?.connected ? "Connected" : "Disconnected"}
              <span className="text-secondary font-medium ml-2">via {status?.source || "—"}</span>
            </p>
            <p className="text-[11px] text-secondary mt-0.5 truncate">
              {status?.user ? `${status.user}@` : ""}{status?.host || "—"}/{status?.database || "—"}
            </p>
          </div>
        </div>

        {status?.usingConfigFile && (
          <div className="rounded-2xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-3">
            <p className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300">
              Using db-config.json — changes hot-reload without server restart.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => setUseUrl(true)} className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${useUrl ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}>Connection String</button>
          <button onClick={() => setUseUrl(false)} className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${!useUrl ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}>Individual Fields</button>
        </div>

        {useUrl ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">DATABASE_URL</label>
              <input value={form.databaseUrl} onChange={(e) => setForm((p) => ({ ...p, databaseUrl: e.target.value }))} className={inputClass} placeholder="postgresql://user:pass@host:5432/db" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">SSL Mode</label>
              <div className="flex gap-2">
                {(["require", "prefer", "allow", "disable"] as const).map((mode) => (
                  <button key={mode} onClick={() => setForm((p) => ({ ...p, ssl: mode }))}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${form.ssl === mode ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
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
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">Database</label>
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
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold text-secondary">SSL Mode</label>
              <div className="flex gap-2">
                {(["require", "prefer", "allow", "disable"] as const).map((mode) => (
                  <button key={mode} onClick={() => setForm((p) => ({ ...p, ssl: mode }))}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all active:scale-90 ${form.ssl === mode ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-surface-hover text-secondary"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 gap-4">
          <button onClick={handleReset} disabled={resetting} className="rounded-xl bg-red-50 dark:bg-red-950/30 px-5 py-2.5 text-[12px] font-bold text-red-600 dark:text-red-400 active:scale-90 transition-all disabled:opacity-40 whitespace-nowrap">
            {resetting ? "Resetting..." : "Reset to Env Var"}
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowProfileDialog(true)} className="rounded-xl border border-card-border px-5 py-2.5 text-[12px] font-bold text-secondary active:scale-90 transition-all">
              Save as Profile
            </button>
            <button onClick={() => handleSave()} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-2.5 text-[13px] font-bold text-white active:scale-90 transition-all disabled:opacity-40">
              {saving ? "Saving..." : "Save & Hot-Reload"}
            </button>
          </div>
        </div>
      </div>

      {/* Saved Profiles */}
      {profiles.length > 0 && (
        <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
          <h3 className="font-black text-primary text-[15px] mb-4">Saved Profiles</h3>
          <div className="space-y-3">
            {profiles.map((profile) => {
              const cfg = profile.config;
              let host = cfg.host || "—";
              let db = cfg.database || "—";
              let user = cfg.user || "—";
              if (cfg.databaseUrl) {
                try {
                  const url = new URL(cfg.databaseUrl);
                  host = url.hostname;
                  db = url.pathname.slice(1);
                  user = url.username;
                } catch {}
              }
              return (
                <div key={profile.name} className="rounded-2xl bg-surface-hover p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-primary text-[13px]">{profile.name}</p>
                    <p className="text-[11px] text-secondary mt-0.5 truncate">{user}@{host}/{db}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApplyProfile(profile.name)} className="rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-bold text-white active:scale-90 transition-all">Connect</button>
                    <button onClick={() => handleDeleteProfile(profile.name)} className="rounded-xl bg-red-50 dark:bg-red-950/30 px-4 py-2 text-[11px] font-bold text-red-600 dark:text-red-400 active:scale-90 transition-all">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save as Profile dialog */}
      <AnimatePresence>
        {showProfileDialog && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => !savingProfile && setShowProfileDialog(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm rounded-[32px] bg-card p-6 shadow-2xl border border-card-border">
              <h3 className="text-xl font-black text-primary mb-1">Save as Profile</h3>
              <p className="text-[13px] text-secondary mb-5">Name this connection to reuse it later.</p>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Supabase Prod, Aiven Dev"
                className="w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-[14px] font-medium text-primary focus:border-blue-500 focus:outline-none mb-5"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowProfileDialog(false); setProfileName(""); }} disabled={savingProfile} className="flex-1 rounded-xl border border-card-border py-3 text-[13px] font-bold text-secondary active:scale-90 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()} className="flex-1 rounded-xl bg-blue-600 py-3 text-[13px] font-bold text-white active:scale-90 transition-all disabled:opacity-40">
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
