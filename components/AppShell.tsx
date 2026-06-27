// components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import BottomNav from "./BottomNav";
import AccessLogger from "./AccessLogger";
import InstallPrompt from "./InstallPrompt";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSharePage = pathname?.startsWith("/share/");
  const isNotMobile = pathname?.startsWith("/not-mobile");

  if (isNotMobile) {
    return <>{children}</>;
  }

  return (
    <>
      {!isSharePage && <Header />}
      {!isSharePage && <AccessLogger />}
      {children}
      {!isSharePage && <BottomNav />}
      {!isSharePage && <InstallPrompt />}
    </>
  );
}
