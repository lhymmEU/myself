"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useT } from "@/lib/i18n/context";

interface PricePoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface PriceChartProps {
  data: PricePoint[];
  height?: number;
}

export function PriceChart({ data, height = 320 }: PriceChartProps) {
  const t = useT();

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        {t("finance.chart.noData")}
      </div>
    );
  }

  const isPositive = data.length >= 2 && data[data.length - 1].close >= data[0].close;
  const color = isPositive ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)";

  const formatted = data.map((d) => ({
    ...d,
    date: d.date.length > 10 ? d.date.slice(0, 10) : d.date,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
          className="text-muted-foreground"
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11 }}
          width={60}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)
          }
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
