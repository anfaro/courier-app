// components/ThemeStyleSelector.tsx
"use client";

import { useTheme } from "./ThemeProvider";
import { useLanguage } from "./LanguageProvider";

type Variant = "full" | "compact";

export default function ThemeStyleSelector({ variant = "full" }: { variant?: Variant }) {
  const { style, setStyle } = useTheme();
  const { t } = useLanguage();

  if (variant === "compact") {
    return (
      <div className="flex rounded-2xl bg-white/50 dark:bg-slate-900/50 p-1 shadow-sm border border-card-border backdrop-blur-sm">
        <button
          onClick={() => setStyle("md3")}
          className={`px-2.5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-90 ${style === "md3" ? "bg-blue-600 text-white shadow-md" : "text-secondary hover:text-primary"}`}
        >
          MD3
        </button>
        <button
          onClick={() => setStyle("clay")}
          className={`px-2.5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-90 ${style === "clay" ? "bg-purple-400 text-white shadow-md" : "text-secondary hover:text-primary"}`}
        >
          Clay
        </button>
      </div>
    );
  }

  const options = [
    {
      key: "md3" as const,
      label: t("settings.style_md3"),
      desc: t("settings.style_md3_desc"),
      active: style === "md3",
      preview: (
        <div className="h-16 rounded-2xl border border-white/60 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.3),transparent_55%),rgba(255,255,255,0.5)] shadow-sm backdrop-blur-xl">
          <div className="flex h-full items-end justify-center pb-2">
            <div className="h-4 w-20 rounded-full bg-white/70 shadow-sm" />
          </div>
        </div>
      ),
    },
    {
      key: "clay" as const,
      label: t("settings.style_clay"),
      desc: t("settings.style_clay_desc"),
      active: style === "clay",
      preview: (
        <div className="h-16 rounded-2xl bg-[#f3eefc] shadow-[8px_8px_18px_rgba(105,90,155,0.32),-8px_-8px_18px_rgba(255,255,255,0.75),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(105,90,155,0.18)]">
          <div className="flex h-full items-end justify-center pb-2">
            <div className="h-4 w-20 rounded-full bg-[#c9bfe3] shadow-[3px_3px_6px_rgba(105,90,155,0.3),-3px_-3px_6px_rgba(255,255,255,0.7)]" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => setStyle(o.key)}
          className={`rounded-[24px] p-3 text-left transition-all active:scale-90 border-2 ${
            o.active
              ? "border-blue-500 dark:border-blue-400 bg-surface-hover shadow-md"
              : "border-transparent bg-surface-hover/60 hover:bg-surface-hover"
          }`}
        >
          {o.preview}
          <p className={`mt-2 text-[13px] font-black leading-tight ${o.active ? "text-blue-600 dark:text-blue-400" : "text-primary"}`}>
            {o.label}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-secondary">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}
