// components/AccessLogger.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AccessLogger() {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    // Skip access logging in production to avoid cold-start overhead on serverless
    if (process.env.NODE_ENV === "production") return;
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return;

    const logPageAccess = async () => {
      try {
        await fetch("/api/admin/system/logs/record-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname,
            method: "GET",
          }),
        });
      } catch (err) {
        // Silent fail for logging
      }
    };

    logPageAccess();
  }, [pathname]); // Fires on every route change

  return null; // Invisible component
}
