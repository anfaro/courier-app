// components/AdminAnalytics.tsx — Summary widget for admin hub
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type LogType = "activity" | "errors" | "access";

interface LogStats {
  today: number;
  week: number;
  total: number;
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState<Record<string, LogStats> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/system/logs/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const types: { key: LogType; label: string; icon: string; color: string }[] = [
    { key: "activity", label: "Activity", icon: "📋", color: "text-blue-600 dark:text-blue-400" },
    { key: "errors", label: "Errors", icon: "⚠️", color: "text-red-600 dark:text-red-400" },
    { key: "access", label: "Access", icon: "🌐", color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {types.map(({ key, label, icon, color }) => {
          const s = stats?.[key];
          return (
            <div key={key} className="rounded-2xl bg-card border border-card-border p-3 text-center">
              <span className="text-xl">{icon}</span>
              <p className={`text-xl font-black mt-0.5 ${color}`}>
                {loading ? "…" : s?.today ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {stats && (
        <div className="flex items-center justify-between px-1 mb-4">
          {(["activity", "errors", "access"] as LogType[]).map((key) => {
            const s = stats[key];
            return (
              <p key={key} className="text-[9px] font-mono text-secondary">
                {s?.total ?? 0} total
              </p>
            );
          })}
        </div>
      )}

      <Link
        href="/admin/logs"
        className="flex items-center justify-between rounded-[24px] bg-blue-600 p-4 text-white shadow-lg shadow-blue-500/20 active:scale-90 transition-all hover:bg-blue-700"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">📊</div>
          <div className="flex flex-col items-start">
            <span className="font-black leading-tight text-[15px]">View Full Logs</span>
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">
              Search, filter, export &amp; manage retention
            </span>
          </div>
        </div>
        <Icon name="chevron-right" size={20} strokeWidth={3} className="text-white/70" />
      </Link>
    </div>
  );
}
