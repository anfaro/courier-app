// components/header.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { useScrollLock } from "@/lib/useScrollLock";

// --- CUSTOM COURIER LOGO SVG ---
const AppLogo = () => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
    {/* Motion Trails */}
    <path d="M4 14H12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-400 opacity-40" />
    <path d="M2 20H10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-500 opacity-60" />
    <path d="M5 26H13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-blue-600 opacity-80" />
    
    {/* Stylized Box/Parcel */}
    <path d="M18 12L28 8L38 12V28L28 32L18 28V12Z" fill="url(#logo-gradient)" />
    <path d="M18 12L28 16L38 12" stroke="white" strokeWidth="1.5" strokeLinejoin="round" opacity="0.4" />
    <path d="M28 16V32" stroke="white" strokeWidth="1.5" strokeLinejoin="round" opacity="0.4" />
    
    <defs>
      <linearGradient id="logo-gradient" x1="18" y1="8" x2="38" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
  </svg>
);

interface SearchResultUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SearchResultCustomer {
  id: string;
  name: string;
  phoneNumber?: string;
}

interface SearchResultCluster {
  id: string;
  name: string;
}

interface SearchResults {
  customers: SearchResultCustomer[];
  clusters: SearchResultCluster[];
  users: SearchResultUser[];
}

import { createPortal } from "react-dom";

export default function Header() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useScrollLock(isMenuOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults>({ customers: [], clusters: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"customer" | "cluster" | "staff" | null>(null);

  const FILTER_REGEX = /^filter:(customer|cluster|staff)(\s|$)/i;

  const handleSearchChange = (value: string) => {
    const match = value.match(FILTER_REGEX);
    if (match) {
      setActiveFilter(match[1].toLowerCase() as "customer" | "cluster" | "staff");
      setSearchQuery(value.replace(FILTER_REGEX, ""));
    } else {
      setSearchQuery(value);
    }
  };
  
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close search results/menu on path change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownVisible(false);
    setSearchQuery("");
    setActiveFilter(null);
  }, [pathname]);

  // Click outside to close results dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Search Debounce
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term || term.length < 2) {
      setSearchResults({ customers: [], clusters: [], users: [] });
      setIsDropdownVisible(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setIsDropdownVisible(true);
      try {
        const params = new URLSearchParams({ q: term });
        if (activeFilter) params.set("type", activeFilter);
        const res = await fetch(`/api/search/global?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.warn("Global search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter]);

  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/not-mobile"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  if (!session?.user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-card-border/50 dark:border-slate-800 bg-background/80 dark:bg-slate-950/80 px-4 py-3 sm:px-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo />
            <span className="text-lg font-black tracking-tighter text-primary dark:text-slate-100 hidden xs:block">
              Courier
            </span>
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
          <AppLogo />
          <span className="text-xl font-black tracking-tighter text-primary dark:text-slate-100 hidden sm:block">
            Courier
          </span>
        </Link>

        {/* --- ALWAYS VISIBLE GLOBAL SEARCH --- */}
        <div ref={searchRef} className="relative flex-1 flex justify-center min-w-0">
          <div className="flex items-center w-full max-w-[500px] transition-all duration-300 rounded-full bg-surface-hover/80 dark:bg-slate-900/80 px-3 sm:px-4 py-2 ring-1 ring-blue-500/10 dark:ring-blue-400/10 shadow-inner group focus-within:ring-blue-500/30 focus-within:bg-card">
            <div className="flex items-center justify-center shrink-0 transition-colors text-secondary group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mr-2">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-1 w-full">
              {activeFilter && (
                <button
                  onClick={() => { setActiveFilter(null); setSearchQuery(""); }}
                  className="shrink-0 flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 active:scale-90 transition-all"
                >
                  {activeFilter}
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setIsDropdownVisible(true)}
                placeholder={activeFilter ? `Search ${activeFilter}s...` : "Search... (filter:customer, filter:cluster, filter:staff)"}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] sm:text-[15px] font-bold text-primary placeholder:text-secondary/50"
              />
            </div>

            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setActiveFilter(null); }} className="ml-2 text-secondary hover:text-primary transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* SEARCH RESULTS DROPDOWN */}
          <AnimatePresence>
            {isDropdownVisible && (searchQuery.trim().length >= 2) && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-full sm:w-[450px] max-h-[70vh] overflow-y-auto rounded-[32px] bg-card/95 dark:bg-slate-900/95 p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-2xl z-[100] custom-scrollbar"
              >
                
                {isSearching && (
                  <div className="flex items-center justify-center p-8">
                    <span className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  </div>
                )}

                {!isSearching && searchResults.customers.length === 0 && searchResults.clusters.length === 0 && (!searchResults.users || searchResults.users.length === 0) && (
                  <div className="p-8 text-center text-secondary font-bold text-[14px]">{t("search.no_results")}</div>
                )}

                {/* STAFF SECTION */}
                {searchResults.users && searchResults.users.length > 0 && (
                  <div className="mb-2">
                    <p className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">{t("search.staff")}</p>
                    {searchResults.users.map((u: SearchResultUser) => (
                      <motion.div
                        key={u.id}
                        whileTap={{ scale: 0.92, rotate: -0.5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover transition-colors group">
                          <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">👤</div>
                          <div className="min-w-0">
                            <p className="font-black text-primary text-[14px] truncate">{u.name}</p>
                            <p className="text-[12px] font-medium text-secondary truncate">{u.email} • <span className="uppercase text-[10px] opacity-70">{u.role}</span></p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* CUSTOMER SECTION */}
                <div className="mb-2">
                  <p className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-secondary/60">{t("search.customers")}</p>
                  {searchResults.customers.length > 0 ? (
                    searchResults.customers.map((c: SearchResultCustomer) => (
                      <motion.div
                        key={c.id}
                        whileTap={{ scale: 0.92, rotate: -0.5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover transition-colors group">
                          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">🏠</div>
                          <div className="min-w-0">
                            <p className="font-black text-primary text-[14px] truncate">{c.name}</p>
                            <p className="text-[12px] font-medium text-secondary truncate">{c.phoneNumber || "No phone"}</p>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    <Link
                      href="/customers/new"
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">➕</div>
                      <div className="min-w-0">
                        <p className="font-black text-primary text-[14px]">Add new customer</p>
                        <p className="text-[12px] font-medium text-secondary truncate">"{searchQuery}" wasn't found</p>
                      </div>
                    </Link>
                  )}
                </div>

                {/* CLUSTER SECTION */}
                {searchResults.clusters.length > 0 && (
                  <div className="mb-2">
                    <p className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">{t("search.clusters")}</p>
                    {searchResults.clusters.map((c: SearchResultCluster) => (
                      <motion.div
                        key={c.id}
                        whileTap={{ scale: 0.92, rotate: -0.5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Link href={`/clusters/${c.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-hover transition-colors group">
                          <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">📍</div>
                          <div className="min-w-0">
                            <p className="font-black text-primary text-[14px] truncate">{c.name}</p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}


              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile & Dropdown */}
        <div className="relative shrink-0">
          <button
            ref={profileRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 dark:bg-blue-400/10 text-lg font-black text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-600/20 dark:ring-blue-400/20 transition-all hover:bg-blue-600/20 dark:hover:bg-blue-400/20 active:scale-90"
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
                        className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-[0.97] rounded-2xl group"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">💰</span>
                        {t("earnings.title")}
                      </Link>

                      {(session?.user as any)?.role === "superadmin" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-[0.97] rounded-2xl group"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">🛡️</span>
                          {t("nav.admin")}
                        </Link>
                      )}

                      <Link
                        href="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-[14px] font-bold text-primary dark:text-slate-200 transition-all hover:bg-surface-hover/50 dark:hover:bg-slate-800/50 active:scale-[0.97] rounded-2xl group"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">⚙️</span>
                        {t("nav.settings")}
                      </Link>

                      <button
                        onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); signOut({ redirect: false }).then(() => { window.location.href = "/login"; }); }}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-50/50 dark:hover:bg-red-950/30 active:scale-[0.97] rounded-2xl group"
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
