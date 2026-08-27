"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

const THEMES = { light: "", dark: ".dark" } as const;

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={className}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
        <ChartStyle id={chartId} config={config} />
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.color || config.theme
  );

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart="${id}"] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.color || itemConfig.theme?.[theme as keyof typeof itemConfig.theme];
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  formatter?: (value: number, name: string, item: any, index: number) => React.ReactNode;
  labelFormatter?: (label: string) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label as string) : label;

  return (
    <div
      className={`rounded-2xl border border-card-border bg-card/95 backdrop-blur-xl p-3 shadow-md ${className ?? ""}`}
    >
      {formattedLabel && (
        <div className="mb-2 text-[11px] font-bold text-primary">{formattedLabel}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const itemConfig = config[item.name as keyof typeof config];
          const value = formatter
            ? formatter(item.value as number, item.name, item, index)
            : item.value;

          return (
            <div
              key={item.dataKey}
              className="flex items-center gap-2 text-[11px]"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-secondary">
                {itemConfig?.label || item.name}
              </span>
              <span className="ml-auto font-bold text-primary">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendContent({
  className,
  payload,
}: React.ComponentProps<typeof RechartsPrimitive.Legend>) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 ${className ?? ""}`}>
      {payload.map((item) => {
        const itemConfig = config[item.value as keyof typeof config];

        return (
          <div
            key={item.value}
            className="flex items-center gap-1.5 text-[11px]"
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-secondary">
              {itemConfig?.label || item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartContext,
  useChart,
  type ChartConfig,
};
