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
    // M3 Top App Bar: Clean background, no harsh borders.
    <header className="bg-[#F8F9FA] px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* App Logo / Title - Slightly larger font for M3 Expressive */}
        <Link href="/" className="text-2xl font-bold tracking-tight text-blue-700">
          MyApp
        </Link>

        {/* User Profile & Dropdown */}
        <div className="relative">
          {/* M3 Avatar Button: Fully rounded, soft primary container color */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-800 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-[#F8F9FA]"
          >
            {initial}
          </button>

          {/* M3 Dropdown: Large border radius (rounded-3xl), soft shadow */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-3xl bg-white py-2 shadow-lg ring-1 ring-black/5 z-50 overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="truncate text-base font-semibold text-gray-900">
                  {session.user.name || "User"}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {session.user.email}
                </p>
              </div>

              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="block px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Profile Settings
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full px-5 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

