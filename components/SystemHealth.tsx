// components/SystemHealth.tsx
"use client";

import { useState, useEffect } from "react";

const defaultStats = [
  { label: "Customers", value: 0, icon: "🏠" },
  { label: "Deliveries", value: 0, icon: "📦" },
  { label: "Clusters", value: 0, icon: "📍" },
  { label: "Users", value: 0, icon: "👥" },
  { label: "Log Entries", value: 0, icon: "📋" },
];

export default function SystemHealth() {
  const [stats, setStats] = useState(defaultStats);
  const [ping, setPing] = useState<number | null>(null);

  const fetchHealth = () => {
    const start = Date.now();
    fetch("/api/admin/system/health")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats || defaultStats);
        setPing(Date.now() - start);
      })
      .catch(() => {
        setPing(-1);
      });
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 sm:px-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-bold tracking-tight text-primary uppercase tracking-widest opacity-60">System Health</h2>
        <div className="flex items-center gap-2">
          {ping !== null && (
            <>
              <span className={`h-2.5 w-2.5 rounded-full ${ping >= 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500"} `} />
              <span className="text-[11px] font-bold text-secondary">{ping >= 0 ? `${ping}ms` : "Offline"}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-card border border-card-border p-4 shadow-sm flex flex-col items-center text-center">
            <span className="text-2xl mb-2">{s.icon}</span>
            <p className="text-xl font-black text-primary">{s.value.toLocaleString()}</p>
            <p className="text-[11px] font-bold text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
