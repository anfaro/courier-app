// components/BottomNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Safely extract the role (defaults to courier if not loaded yet)
  const userRole = (session?.user as any)?.role || "courier";

  // --- SCROLL DETECTION STATE ---
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // FIX: Don't render the nav on Auth or Reset pages
  const authPaths = ["/login", "/signup", "/forgot-password", "/reset-password"];
  if (authPaths.some(path => pathname.startsWith(path))) return null;

  useEffect(() => {
    const controlNavbar = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const currentScrollY = target === document ? window.scrollY : (target as HTMLElement).scrollTop;
      if (currentScrollY === lastScrollY) return;

      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlNavbar, true);
    return () => window.removeEventListener("scroll", controlNavbar, true);
  }, [lastScrollY]);

  // --- DYNAMIC NAVIGATION ITEMS ---
  const baseNavItems = [
    {
      name: "Home",
      href: "/",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    },
    {
      name: "Waybills",
      href: "/deliveries",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    },
    {
      name: "Customers",
      href: "/customers",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    },
  ];

  // If Superadmin, show Admin Hub. If Courier, show Clusters.
  const roleSpecificItem = userRole === "superadmin"
    ? {
      name: "Admin",
      href: "/admin",
      // Shield Icon for Admin
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    }
    : {
      name: "Clusters",
      href: "/clusters",
      // Pin Icon for Clusters
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
    };

  const mapItem = {
    name: "Map",
    href: "/map",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
  };

  // Combine them to maintain exactly 5 items
  const navItems = [...baseNavItems, roleSpecificItem, mapItem];

  return (
    <div
      className={`fixed bottom-4 left-0 right-0 z-[100] flex justify-center px-4 pb-safe transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${isVisible ? "translate-y-0" : "translate-y-[150%]"
        }`}
    >
      <nav className="flex h-[72px] w-full max-w-[400px] items-center justify-between rounded-full bg-white/90 px-2 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
        {navItems.map((item) => {
          // Strict active checking
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className="group relative flex flex-1 flex-col items-center justify-center h-full active:scale-95 transition-transform duration-200"
            >
              {/* THE FIX: Solid Blue active pill for high visibility */}
              <div
                className={`flex h-[32px] w-[56px] items-center justify-center rounded-full transition-all duration-300 ease-out ${isActive ? "bg-blue-600 scale-100 shadow-md shadow-blue-600/30" : "bg-transparent scale-95 group-hover:bg-gray-100"
                  }`}
              >
                <svg
                  className={`h-[22px] w-[22px] transition-colors duration-300 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {item.icon}
                </svg>
              </div>
              <span
                className={`mt-1 text-[10px] font-extrabold tracking-tight transition-all duration-300 ${isActive ? "text-blue-700" : "text-gray-400"
                  }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

