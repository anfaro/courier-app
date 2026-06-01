// components/BottomNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, UserGroupIcon, Chart01Icon, Layers01Icon } from "@hugeicons/core-free-icons";

import { motion, AnimatePresence } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastScrollYRef = useRef(0);

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
    let lastScrollY = 0;
    
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
            lastScrollY = currentScrollY;
            lastScrollYRef.current = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide BottomNav on auth pages
  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/not-mobile"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  const navItems = [
    {
      name: t("nav.dashboard"),
      href: "/",
      icon: <HugeiconsIcon icon={Home01Icon} size={22} strokeWidth={2} color="currentColor" />,
    },
    {
      name: t("nav.customers"),
      href: "/customers",
      icon: <HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={2} color="currentColor" />,
    },
    {
      name: t("session.title"),
      href: "/progress",
      icon: <HugeiconsIcon icon={Chart01Icon} size={22} strokeWidth={2} color="currentColor" />,
    },
    {
      name: t("nav.clusters"),
      href: "/clusters",
      icon: <HugeiconsIcon icon={Layers01Icon} size={22} strokeWidth={2} color="currentColor" />,
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
            className="pointer-events-auto flex h-[64px] w-full items-center justify-between rounded-t-[24px] bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border-t border-card-border/50 dark:border-slate-800 transition-colors"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative flex flex-1 flex-col items-center justify-center h-full active:scale-90 transition-transform"
                >
                  <div className="relative flex flex-col items-center justify-center w-full h-full">
                    {/* Active pill — MD3 filled container */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-xl bg-blue-600/10 dark:bg-blue-400/15"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="relative z-10"
                      style={{ color: isActive ? "var(--color-primary)" : "var(--text-secondary)" }}
                    >
                      {item.icon}
                    </motion.div>

                    {/* Label */}
                    <motion.span
                      animate={{ 
                        color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                        opacity: isActive ? 1 : 0.5,
                      }}
                      className="mt-0 text-[11px] font-bold z-10 leading-none"
                    >
                      {item.name}
                    </motion.span>
                  </div>
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
