"use client";

import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

interface DayData {
  date: string;
  month: string;
  total: number;
  delivered: number;
}

export default function SessionDayChart({ data }: { data: DayData[] }) {
  const { t, locale } = useLanguage();

  if (!data.length) return null;

  const totalAll = data.reduce((s, d) => s + d.total, 0);
  const deliveredAll = data.reduce((s, d) => s + d.delivered, 0);
  const overallPct = totalAll > 0 ? Math.round((deliveredAll / totalAll) * 100) : 0;
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  const dateLocale = locale === "id" ? "id-ID" : "en-GB";

  const months = Array.from(new Set(data.map((d) => d.month)));

  function formatMonth(month: string) {
    const d = new Date(month + "-01T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
  }

  function getDay(date: string) {
    return Number(date.split("-")[2]);
  }

  const barW = 12;
  const barGap = 2;
  const dayGap = 6;
  const monthGap = 20;
  const chartH = 150;
  const labelH = 20;
  const monthHeaderH = 24;

  function calcSectionWidth(days: DayData[]) {
    return days.length * (barW * 2 + barGap + dayGap) - dayGap + monthGap;
  }

  let svgWidth = monthGap;
  for (const month of months) {
    const monthData = data.filter((d) => d.month === month);
    svgWidth += calcSectionWidth(monthData);
  }

  let xOffset = monthGap / 2;

  return (
    <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
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

      <div className="overflow-x-auto no-scrollbar -mx-1">
        <svg width={svgWidth} height={chartH + labelH + monthHeaderH + 12} className="mx-1">
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = monthHeaderH + 12 + chartH - chartH * frac;
            return (
              <g key={frac}>
                <line x1={0} y1={y} x2={svgWidth} y2={y} stroke="currentColor" className="text-card-border" strokeWidth={1} />
                <text x={-4} y={y + 4} textAnchor="end" className="fill-secondary" fontSize={9} fontWeight={600}>
                  {Math.round(maxVal * frac)}
                </text>
              </g>
            );
          })}

          {months.map((month) => {
            const monthData = data.filter((d) => d.month === month);
            const sectionW = calcSectionWidth(monthData);
            const startX = xOffset;

            xOffset += sectionW;

            return (
              <g key={month}>
                <text
                  x={startX}
                  y={monthHeaderH + 4}
                  className="fill-primary"
                  fontSize={12}
                  fontWeight={800}
                >
                  {formatMonth(month)}
                </text>
                {monthData.map((d, i) => {
                  const x = startX + i * (barW * 2 + barGap + dayGap);
                  const totalH = (d.total / maxVal) * (chartH - 8);
                  const delH = (d.delivered / maxVal) * (chartH - 8);
                  const barBottom = monthHeaderH + 12 + chartH;
                  return (
                    <g key={d.date}>
                      <motion.rect
                        initial={{ height: 0, y: barBottom }}
                        animate={{ height: totalH, y: barBottom - totalH }}
                        transition={{ delay: Math.min(i, 20) * 0.01, duration: 0.3, ease: "easeOut" }}
                        x={x}
                        width={barW}
                        rx={3}
                        className="fill-blue-200 dark:fill-blue-800/60"
                      />
                      <motion.rect
                        initial={{ height: 0, y: barBottom }}
                        animate={{ height: delH, y: barBottom - delH }}
                        transition={{ delay: Math.min(i, 20) * 0.01 + 0.02, duration: 0.3, ease: "easeOut" }}
                        x={x + barW + barGap}
                        width={barW}
                        rx={3}
                        className="fill-emerald-400 dark:fill-emerald-500"
                      />
                      <text
                        x={x + barW + barGap / 2}
                        y={barBottom + 12}
                        textAnchor="middle"
                        className="fill-secondary"
                        fontSize={8}
                        fontWeight={700}
                      >
                        {getDay(d.date)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
