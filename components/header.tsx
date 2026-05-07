// components/Header.tsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!session?.user) return null;

  const initial = session.user.name
    ? session.user.name.charAt(0).toUpperCase()
    : session.user.email?.charAt(0).toUpperCase() || "U";

  return (
    // M3 Expressive Glass-morphism: Translucent background with deep blur
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-[#F8F9FA]/80 px-4 py-3 sm:px-6 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between">

        {/* App Logo - Upgraded with a tight tracking and gradient text */}
        <Link href="/" className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-2xl font-black tracking-tighter text-transparent active:opacity-80">
          MyApp
        </Link>

        {/* User Profile & Dropdown */}
        <div className="relative">
          {/* M3 Avatar Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 text-lg font-black text-blue-700 shadow-sm ring-1 ring-blue-600/20 transition-all hover:bg-blue-600/20 active:scale-95"
          >
            {initial}
          </button>

          {/* M3 Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Invisible backdrop to catch clicks outside the menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-64 rounded-[28px] bg-white/90 py-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95">
                <div className="border-b border-gray-100/50 px-6 py-4 bg-gray-50/50">
                  <p className="truncate text-[15px] font-black text-gray-900">
                    {session.user.name || "User"}
                  </p>
                  <p className="truncate text-[13px] font-medium text-gray-500">
                    {session.user.email}
                  </p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-6 py-3.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100/50 active:bg-gray-200"
                >
                  Profile Settings
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-6 py-3.5 text-left text-[14px] font-bold text-red-600 transition-colors hover:bg-red-50/50 active:bg-red-100"
                >
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

