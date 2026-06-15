// components/BottomNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Listen for modal open/close events
  useEffect(() => {
    const handleModalChange = (e: CustomEvent) => {
      setIsModalOpen(e.detail.isOpen);
    };
    window.addEventListener("modal:change", handleModalChange as EventListener);
    return () => window.removeEventListener("modal:change", handleModalChange as EventListener);
  }, []);

  // Hide BottomNav on auth pages
  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/not-mobile"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  const navItems = [
    {
      name: t("nav.dashboard"),
      href: "/",
      icon: <Icon name="home" size={22} strokeWidth={2} />,
    },
    {
      name: t("nav.customers"),
      href: "/customers",
      icon: <Icon name="person-group" size={22} strokeWidth={2} />,
    },
    {
      name: t("session.title"),
      href: "/progress",
      icon: <Icon name="route" size={22} strokeWidth={2} />,
    },
    {
      name: t("nav.clusters"),
      href: "/clusters",
      icon: <Icon name="layers" size={22} strokeWidth={2} />,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-none">
      {!isModalOpen && (
        <nav className="pointer-events-auto flex h-[64px] w-full items-center justify-between rounded-t-[24px] bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border-t border-card-border/50 dark:border-slate-800 transition-colors"
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
          </nav>
        )}
    </div>
  );
}
