// components/AuthThemeSelector.tsx
"use client";

import { useTheme } from "@/components/ThemeProvider";
import ThemeStyleSelector from "@/components/ThemeStyleSelector";

export default function AuthThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
      <div className="segment-control flex rounded-2xl p-1 shadow-sm border border-card-border">
        <button 
          onClick={() => setTheme("light")}
          className={`px-3 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${theme === 'light' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          ☀️
        </button>
        <button 
          onClick={() => setTheme("dark")}
          className={`px-3 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${theme === 'dark' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          🌙
        </button>
      </div>
      <ThemeStyleSelector variant="compact" />
    </div>
  );
}
