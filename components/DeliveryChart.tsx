"use client";

import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

interface DayData {
  date: string;
  total: number;
  delivered: number;
}

export default function DeliveryChart({ data }: { data: DayData[] }) {
  const { t, locale } = useLanguage();

  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const totalAll = data.reduce((s, d) => s + d.total, 0);
  const deliveredAll = data.reduce((s, d) => s + d.delivered, 0);
  const overallPct = totalAll > 0 ? Math.round((deliveredAll / totalAll) * 100) : 0;

  const barGap = 6;
  const barPairWidth = 36;
  const barWidth = 14;
  const chartHeight = 180;
  const labelHeight = 40;
  const svgWidth = data.length * (barPairWidth + barGap) + barGap;

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  function formatLabel(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
  }

  return (
    <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-400" />
            <span className="text-[11px] font-bold text-primary">{deliveredAll}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-800" />
            <span className="text-[11px] font-bold text-secondary">{totalAll}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-secondary">{t("session.delivered")}</span>
          <span className={`text-[15px] font-black ${overallPct >= 80 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto custom-scrollbar -mx-1">
        <svg width={svgWidth} height={chartHeight + labelHeight} className="mx-1">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = chartHeight - chartHeight * frac;
            return (
              <g key={frac}>
                <line x1={0} y1={y} x2={svgWidth} y2={y} stroke="currentColor" className="text-card-border" strokeWidth={1} />
                <text x={-4} y={y + 4} textAnchor="end" className="fill-secondary" fontSize={9} fontWeight={600}>
                  {Math.round(maxVal * frac)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const x = barGap + i * (barPairWidth + barGap);
            const totalH = (d.total / maxVal) * (chartHeight - 10);
            const delH = (d.delivered / maxVal) * (chartHeight - 10);
            return (
              <g key={d.date}>
                {/* Total bar */}
                <motion.rect
                  initial={{ height: 0, y: chartHeight }}
                  animate={{ height: totalH, y: chartHeight - totalH }}
                  transition={{ delay: Math.min(i, 10) * 0.02, duration: 0.3, ease: "easeOut" }}
                  x={x}
                  width={barWidth}
                  rx={4}
                  className="fill-blue-200 dark:fill-blue-800/60"
                />
                {/* Delivered bar */}
                <motion.rect
                  initial={{ height: 0, y: chartHeight }}
                  animate={{ height: delH, y: chartHeight - delH }}
                  transition={{ delay: Math.min(i, 10) * 0.02 + 0.04, duration: 0.3, ease: "easeOut" }}
                  x={x + barWidth + 2}
                  width={barWidth}
                  rx={4}
                  className="fill-emerald-400 dark:fill-emerald-500"
                />
                {/* Date label */}
                <text
                  x={x + barPairWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="end"
                  transform={`rotate(-45, ${x + barPairWidth / 2}, ${chartHeight + 15})`}
                  className="fill-secondary"
                  fontSize={9}
                  fontWeight={600}
                >
                  {formatLabel(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
