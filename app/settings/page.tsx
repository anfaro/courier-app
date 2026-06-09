"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";
import { APP_VERSION } from "@/lib/version";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { showToast } = useToast();

  const [name, setName] = useState(session?.user?.name || "");
  const [lastSessionName, setLastSessionName] = useState(session?.user?.name);
  const [rate, setRate] = useState("1500");
  const [savedRate, setSavedRate] = useState("1500");
  const [targetSystem, setTargetSystem] = useState(true);
  const [savedTargetSystem, setSavedTargetSystem] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commitHash, setCommitHash] = useState("...");

  useEffect(() => {
    fetch("/api/app-info")
      .then((r) => r.json())
      .then((d) => setCommitHash(d.commit))
      .catch(() => setCommitHash("unknown"));
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.rate != null) { setRate(String(d.rate)); setSavedRate(String(d.rate)); } if (d?.targetSystem != null) { setTargetSystem(d.targetSystem); setSavedTargetSystem(d.targetSystem); } })
      .catch(() => {});
  }, []);

  if (session?.user?.name !== lastSessionName) {
    setName(session?.user?.name || "");
    setLastSessionName(session?.user?.name);
  }

  const userRole = (session?.user as any)?.role || "courier";
  const roleLabel = userRole === "superadmin" ? "Admin" : userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "?";

  const inputClass = "w-full rounded-2xl border border-card-border bg-background px-5 py-3.5 text-[15px] font-medium text-primary transition-all focus:border-blue-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary shadow-inner";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Breadcrumbs />
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-[2.5rem] bg-card p-6 shadow-sm border border-card-border">
            <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] bg-surface-hover text-3xl border border-card-border mb-4">⏳</div>
            <p className="text-[16px] font-bold text-secondary animate-pulse">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Breadcrumbs />
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] bg-card p-10 text-center shadow-sm border border-card-border">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950 text-2xl">🔒</div>
            <p className="text-lg font-bold text-primary">Please log in to view settings.</p>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName: name,
          rate: Number(rate),
          targetSystem,
        }),
      });

      if (res.ok) {
        showToast(t("settings.success"), "success");
        setSavedRate(rate);
        setSavedTargetSystem(targetSystem);
        await update({ name: name, targetSystem });
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update profile.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6 space-y-5">

        {/* ===== Profile Card ===== */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-card border border-card-border shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-blue-100 dark:bg-blue-900/60 text-3xl font-extrabold text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
              {initial}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-extrabold tracking-tight text-primary">{session.user.name}</h1>
              <p className="text-[15px] font-medium text-secondary mt-0.5">{session.user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 px-3.5 py-1 text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider border border-purple-200/50 dark:border-purple-800/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-[14px] font-bold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ===== Preferences ===== */}
        <div className="rounded-[2.5rem] bg-card border border-card-border shadow-sm p-6 sm:p-8">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-secondary mb-6 flex items-center gap-2">
            <span className="text-base">🎨</span> {t("settings.appearance")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold text-secondary mb-3 uppercase tracking-wider ml-1">Theme</p>
              <div className="flex rounded-2xl bg-surface-hover p-1.5 border border-card-border">
                <button
                  onClick={(e) => setTheme("light", { x: e.clientX, y: e.clientY })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all active:scale-90 ${theme === 'light' ? 'bg-card text-blue-600 shadow-sm border border-card-border' : 'text-secondary hover:text-primary'}`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={(e) => setTheme("dark", { x: e.clientX, y: e.clientY })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all active:scale-90 ${theme === 'dark' ? 'bg-card text-blue-400 shadow-sm border border-card-border' : 'text-secondary hover:text-primary'}`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-secondary mb-3 uppercase tracking-wider ml-1">{t("settings.language")}</p>
              <div className="flex rounded-2xl bg-surface-hover p-1.5 border border-card-border">
                <button
                  onClick={() => setLocale("en")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all active:scale-90 ${locale === 'en' ? 'bg-card text-blue-600 shadow-sm border border-card-border' : 'text-secondary hover:text-primary'}`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => setLocale("id")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all active:scale-90 ${locale === 'id' ? 'bg-card text-blue-600 shadow-sm border border-card-border' : 'text-secondary hover:text-primary'}`}
                >
                  🇮🇩 Indonesia
                </button>
              </div>
            </div>
          </div>

          {/* Target System Toggle */}
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-surface-hover p-4 border border-card-border">
            <div>
              <p className="text-[13px] font-bold text-primary">{t("settings.target_system")}</p>
              <p className="text-[11px] font-medium text-secondary mt-0.5">{t("settings.target_system_desc")}</p>
            </div>
            <button
              onClick={() => setTargetSystem(!targetSystem)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-all active:scale-90 ${
                targetSystem ? 'bg-blue-600' : 'bg-surface-hover border border-card-border'
              }`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                targetSystem ? 'left-[22px]' : 'left-[3px]'
              }`} />
            </button>
          </div>
        </div>

        {/* ===== Profile Information ===== */}
        <div className="rounded-[2.5rem] bg-card border border-card-border shadow-sm p-6 sm:p-8">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-secondary mb-6 flex items-center gap-2">
            <span className="text-base">👤</span> {t("settings.title")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-secondary">{t("settings.email_label")}</label>
              <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-surface-hover px-5 py-3.5">
                <span className="text-lg">📧</span>
                <span className="text-[15px] font-medium text-secondary flex-1 truncate">{session.user.email}</span>
                <span className="text-[10px] font-black text-secondary/40 uppercase">{t("settings.readonly")}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-secondary">{t("settings.name_label")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-secondary">{t("settings.rate_label")}</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-secondary">Rp</span>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  min="0"
                  step="100"
                  className={`${inputClass} pl-12`}
                  placeholder="1500"
                />
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-secondary ml-1">{t("settings.rate_hint")}</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || (name === session.user?.name && rate === savedRate && targetSystem === savedTargetSystem)}
                className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:active:scale-100 !rounded-full !px-8"
              >
                {isLoading ? t("settings.saving") : t("settings.save")}
              </button>
            </div>
          </form>
        </div>

        {/* ===== About ===== */}
        <div className="rounded-[2.5rem] bg-card border border-card-border shadow-sm p-6 sm:p-8">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-secondary mb-6 flex items-center gap-2">
            <span className="text-base">ℹ️</span> About
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 text-[11px] font-black text-blue-700 dark:text-blue-300 tracking-wider uppercase border border-blue-100/50 dark:border-blue-800/50">
              v{APP_VERSION}
            </span>
            <span className="rounded-full bg-surface-hover px-4 py-1.5 text-[11px] font-black text-secondary tracking-wider uppercase border border-card-border font-mono">
              {commitHash}
            </span>
          </div>
          <p className="mt-4 text-[11px] font-bold text-secondary/40 uppercase tracking-widest">
            Courier SuperApp &middot; 2026
          </p>
        </div>

      </main>
    </div>
  );
}
