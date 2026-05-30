// components/BottomNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

import { motion, AnimatePresence } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Listen for modal open/close events
  useEffect(() => {
    const handleModalChange = (e: CustomEvent) => {
      setIsModalOpen(e.detail.isOpen);
    };
    window.addEventListener("modal:change", handleModalChange as EventListener);
    return () => window.removeEventListener("modal:change", handleModalChange as EventListener);
  }, []);

  // Improved Hide/Show logic with a small threshold to prevent "flickering" during scroll
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Only change visibility if we've scrolled more than a small threshold
          if (Math.abs(currentScrollY - lastScrollY) > 10) {
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
              setIsVisible(false);
            } else {
              setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Hide BottomNav on auth pages
  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/not-mobile"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  const isSuperAdmin = (session?.user as any)?.role === "superadmin";

  const navItems = [
    {
      name: t("nav.dashboard"),
      href: "/",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    },
    {
      name: t("nav.customers"),
      href: "/customers",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    },
    {
      name: t("nav.map"),
      href: "/map",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
    },
    {
      name: t("nav.clusters"),
      href: "/clusters",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
    },
    isSuperAdmin
      ? {
          name: t("nav.admin"),
          href: "/admin",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
        }
      : {
          name: t("nav.settings"),
          href: "/settings",
          icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
        },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-none">
      <AnimatePresence>
        {(isVisible && !isModalOpen) && (
          <motion.nav 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-auto flex h-[72px] w-full items-center justify-between rounded-t-[28px] bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] border-t border-card-border/50 dark:border-slate-800 transition-colors"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative flex flex-1 flex-col items-center justify-center h-full no-transition"
                >
                  <div className="relative flex flex-col items-center justify-center w-full h-full">
                    <motion.svg
                      animate={{ 
                        scale: isActive ? 1.2 : 1,
                        y: isActive ? -2 : 0,
                        color: isActive ? "var(--color-primary)" : "var(--text-secondary)"
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="relative h-[24px] w-[24px] z-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {item.icon}
                    </motion.svg>
                    
                    <motion.span
                      animate={{ 
                        scale: isActive ? 1 : 0.9,
                        y: isActive ? 1 : 0,
                        color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                        opacity: isActive ? 1 : 0.6
                      }}
                      className="mt-1 text-[10px] font-black tracking-tight z-10"
                    >
                      {item.name}
                    </motion.span>

                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </div>
                  
                  {/* Hover Highlight */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-2xl bg-surface-hover/0 group-hover:bg-surface-hover/30 -z-10 transition-colors duration-200" />
                  )}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
