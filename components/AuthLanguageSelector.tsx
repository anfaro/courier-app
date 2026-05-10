// components/AuthLanguageSelector.tsx
"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function AuthLanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="absolute top-6 right-6 z-50">
      <div className="flex rounded-2xl bg-white/50 dark:bg-slate-900/50 p-1 shadow-sm border border-card-border backdrop-blur-sm">
        <button 
          onClick={() => setLocale("en")}
          className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${locale === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLocale("id")}
          className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all active:scale-90 ${locale === 'id' ? 'bg-blue-600 text-white shadow-md' : 'text-secondary hover:text-primary'}`}
        >
          ID
        </button>
      </div>
    </div>
  );
}
