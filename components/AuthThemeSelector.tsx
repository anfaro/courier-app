// components/AuthThemeSelector.tsx
"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function AuthThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute top-6 right-6 z-50">
      <div className="flex rounded-2xl bg-white/50 dark:bg-slate-900/50 p-1 shadow-sm border border-card-border backdrop-blur-sm">
        <button 
          onClick={(e) => setTheme("light", { x: e.clientX, y: e.clientY })}
          className={`px-3 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${theme === 'light' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          ☀️
        </button>
        <button 
          onClick={(e) => setTheme("dark", { x: e.clientX, y: e.clientY })}
          className={`px-3 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${theme === 'dark' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          🌙
        </button>
      </div>
    </div>
  );
}
