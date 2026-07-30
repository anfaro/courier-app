// components/header.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { useScrollLock } from "@/lib/useScrollLock";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

import { createPortal } from "react-dom";

export default function Header() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useScrollLock(isMenuOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const profileRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setSearchQuery("");
  }, [pathname]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/not-mobile"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  if (!session?.user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-card-border/50 dark:border-slate-800 bg-background/80 dark:bg-slate-950/80 px-4 py-3 sm:px-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span> className="text-[18px] font-black tracking-tighter text-primary dark:text-slate-100 hidden xs:block">Courier</span>
          </div>
          <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </header>
    );
  }

  const initial = session.user.name
    ? session.user.name.charAt(0).toUpperCase()
    : session.user.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border/50 dark:border-slate-800 bg-background/80 dark:bg-slate-950/80 px-4 py-3 sm:px-6 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">

        {/* App Logo & Title */}
        <Link href="/" className="flex items-center gap-2 shrink-0 active:scale-90 transition-transform">
          <Logo />
          <span className="text-[20px] font-black tracking-tighter text-primary dark:text-slate-100 hidden sm:block">Courier</span>
        </Link>

        {/* Search Bar or Branding on /search */}
        <div className="relative flex-1 flex justify-center min-w-0">
          {pathname === "/search" ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center gap-2"
            >
              <span className="text-[16px] sm:text-[18px] font-black tracking-tight bg-gradient-to-r from-blue-600 via-purple-500 to-emerald-500 bg-clip-text text-transparent">
                Courier SuperApps
              </span>
              <span className="hidden sm:inline text-[11px] font-bold text-secondary/50 tracking-widest uppercase">Search</span>
            </motion.div>
          ) : (
            <div className="flex items-center w-full max-w-[500px] transition-all duration-300 rounded-full bg-surface-hover/80 dark:bg-slate-900/80 px-3 sm:px-4 py-2 ring-1 ring-blue-500/10 dark:ring-blue-400/10 shadow-inner group focus-within:ring-blue-500/30 focus-within:bg-card">
              <div className="flex items-center justify-center shrink-0 transition-colors text-secondary group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mr-2">
                <Icon name="search" size={18} strokeWidth={2.5} className="sm:hidden" />
                <Icon name="search" size={20} strokeWidth={2.5} className="hidden sm:block" />
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search customers, clusters… (Enter to search)"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] sm:text-[15px] font-bold text-primary placeholder:text-secondary/50"
              />

              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="ml-2 text-secondary hover:text-primary transition-colors active:scale-90">
                  <Icon name="close" size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Dropdown */}
        <div className="relative shrink-0">
          <button
            ref={profileRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 dark:bg-blue-400/10 text-[18px] font-black text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-600/20 dark:ring-blue-400/20 transition-all hover:bg-blue-600/20 dark:hover:bg-blue-400/20 active:scale-90"
          >
            {initial}
          </button>

          {mounted && typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
              {isMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 sm:p-6 pt-16">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 -z-10 bg-black/5 dark:bg-black/20 backdrop-blur-md"
                    onClick={() => setIsMenuOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-72 rounded-[32px] bg-card/98 dark:bg-slate-900/98 p-2 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 backdrop-blur-3xl overflow-hidden"
                  >
                    <div className="px-6 py-5 mb-1 bg-surface-hover/50 dark:bg-slate-800/50 rounded-[24px] border border-card-border/50">
                      <p className="truncate text-[16px] font-black text-primary dark:text-slate-100 tracking-tight">
                        {session.user.name || "User"}
                      </p>
                      <p className="truncate text-[13px] font-medium text-secondary dark:text-slate-400 opacity-80 mt-0.5">
                        {session.user.email}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/earnings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-90 rounded-2xl group"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">💰</span>
                        {t("earnings.title")}
                      </Link>

                      {(session?.user as any)?.role === "superadmin" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-90 rounded-2xl group"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">🛡️</span>
                          {t("nav.admin")}
                        </Link>
                      )}

                      <Link
                        href="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-90 rounded-2xl group"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">⚙️</span>
                        {t("nav.settings")}
                      </Link>

                      <button
                        onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); signOut({ redirect: false }).then(() => { window.location.href = "/login"; }); }}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-50/50 dark:hover:bg-red-950/30 active:scale-90 rounded-2xl group"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">🚪</span>
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      </div>
    </header>
  );
}
