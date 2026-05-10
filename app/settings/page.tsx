// app/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const inputClass = "w-full rounded-2xl border border-transparent bg-gray-100 dark:bg-slate-800 px-5 py-4 text-[16px] text-gray-900 dark:text-slate-100 transition-all focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex min-h-[50vh] flex-col items-center justify-center rounded-[2.5rem] bg-card p-6 shadow-sm border border-card-border">
            <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-[1.5rem] border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-3xl">
              ⏳
            </div>
            <p className="animate-pulse text-[16px] font-bold text-secondary">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="mx-auto max-w-2xl p-4 sm:p-6">
          <div className="mt-4 flex flex-col items-center justify-center rounded-[2.5rem] bg-card p-10 text-center shadow-sm border border-card-border">
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
          email: session.user?.email,
          newName: name
        }),
      });

      if (res.ok) {
        showToast(t("settings.success"), "success");
        await update({ name: name });
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
    <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
      <Breadcrumbs />

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mt-4 rounded-[2.5rem] border border-card-border bg-card p-6 shadow-sm sm:p-10 transition-colors duration-300">

          {/* Profile Header */}
          <div className="mb-8 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
            <div className="mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.5rem] bg-blue-100 dark:bg-blue-900 text-4xl font-extrabold text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800 sm:mb-0">
              {session.user?.name ? session.user.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">{t("settings.title")}</h1>
              <p className="mt-1 text-[15px] font-medium text-secondary">{t("settings.subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {/* Appearance */}
            <div className="rounded-3xl bg-gray-50 dark:bg-slate-800/50 p-6 border border-card-border">
                <h2 className="text-[15px] font-bold text-primary mb-4 flex items-center gap-2">
                    <span>🎨</span> {t("settings.appearance")}
                </h2>
                <div className="flex rounded-2xl bg-gray-200 dark:bg-slate-900 p-1.5">
                    <button 
                        onClick={() => setTheme("light")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black transition-all ${theme === 'light' ? 'bg-white text-blue-600 shadow-md' : 'text-secondary hover:text-primary'}`}
                    >
                        <span>☀️</span> {t("settings.light")}
                    </button>
                    <button 
                        onClick={() => setTheme("dark")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black transition-all ${theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-md border border-slate-700' : 'text-secondary hover:text-primary'}`}
                    >
                        <span>🌙</span> {t("settings.dark")}
                    </button>
                </div>
            </div>

            {/* Language */}
            <div className="rounded-3xl bg-gray-50 dark:bg-slate-800/50 p-6 border border-card-border">
                <h2 className="text-[15px] font-bold text-primary mb-4 flex items-center gap-2">
                    <span>🌐</span> {t("settings.language")}
                </h2>
                <div className="flex rounded-2xl bg-gray-200 dark:bg-slate-900 p-1.5">
                    <button 
                        onClick={() => setLocale("en")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black transition-all ${locale === 'en' ? 'bg-white text-blue-600 shadow-md' : 'text-secondary hover:text-primary'}`}
                    >
                        English
                    </button>
                    <button 
                        onClick={() => setLocale("id")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black transition-all ${locale === 'id' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md' : 'text-secondary hover:text-primary'}`}
                    >
                        Indonesia
                    </button>
                </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 text-[15px] font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">
                {t("settings.email_label")} <span className="text-sm font-normal text-secondary opacity-50">({t("settings.readonly")})</span>
              </label>
              <input
                type="email"
                value={session.user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-transparent bg-gray-50 dark:bg-slate-800/50 px-5 py-4 text-[16px] text-secondary opacity-70"
              />
            </div>

            <div>
              <label className="mb-2 block text-[15px] font-semibold text-secondary">
                {t("settings.name_label")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="Your Name"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || name === session.user?.name}
                className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:active:scale-100"
              >
                {isLoading ? t("settings.saving") : t("settings.save")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
