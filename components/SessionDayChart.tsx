"use client";

import { useLanguage } from "./LanguageProvider";
import {
  ChartContext,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { Bar, BarChart, XAxis } from "recharts";

interface DayData {
  date: string;
  month: string;
  total: number;
  delivered: number;
}

const chartConfig = {
  total: {
    label: "Total",
    color: "#3b82f6",
  },
  delivered: {
    label: "Delivered",
    color: "#10b981",
  },
} satisfies ChartConfig;

export default function SessionDayChart({ data }: { data: DayData[] }) {
  const { t } = useLanguage();

  if (!data.length) return null;

  const totalAll = data.reduce((s, d) => s + d.total, 0);
  const deliveredAll = data.reduce((s, d) => s + d.delivered, 0);
  const overallPct = totalAll > 0 ? Math.round((deliveredAll / totalAll) * 100) : 0;

  const chartData = data.map((d) => ({
    name: String(Number(d.date.split("-")[2])),
    total: d.total,
    delivered: d.delivered,
  }));

  const barSize = 16;
  const barGap = 4;
  const groupGap = 10;
  const marginRight = 16;
  const chartWidth = data.length * (barSize * 2 + barGap + groupGap) - groupGap + marginRight;
  const chartHeight = 200;
  const minHeight = 300;

  return (
    <div className="rounded-[24px] bg-card border border-card-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-[11px] font-bold text-primary">{deliveredAll}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-blue-500" />
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

      <div className="overflow-x-auto no-scrollbar -mx-1 outline-none [&_*]:outline-none">
        <div className="px-1" style={{ minWidth: Math.min(minHeight, chartWidth) }}>
          <ChartContext.Provider value={{ config: chartConfig }}>
            <BarChart
              data={chartData}
              width={chartWidth}
              height={chartHeight}
              margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) =>
                      `${value} ${name === "delivered" ? t("session.delivered") : t("session.total") || "Total"}`
                    }
                  />
                }
              />
              <Bar
                dataKey="total"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
                barSize={barSize}
                activeBar={{ fill: "#60a5fa", fillOpacity: 0.5 }}
              />
              <Bar
                dataKey="delivered"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
                barSize={barSize}
                activeBar={{ fill: "#34d399", fillOpacity: 0.5 }}
              />
            </BarChart>
          </ChartContext.Provider>
        </div>
      </div>
    </div>
  );
}
