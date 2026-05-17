"use client";

import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-red-600 px-5 py-3 shadow-xl">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold">!</div>
        <p className="text-[14px] font-bold text-white">No internet connection. Data may be stale.</p>
      </div>
    </div>
  );
}
