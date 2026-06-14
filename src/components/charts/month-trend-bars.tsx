"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
} from "recharts";

export interface TrendBar {
  label: string; // 例: "6月"
  total: number;
  current: boolean; // 当月（強調する）
}

interface MonthTrendBarsProps {
  data: TrendBar[];
  height?: number;
}

/** 直近Nヶ月の月推移。当月バーをアクセント色、他はミュート色で表示。 */
export function MonthTrendBars({ data, height = 140 }: MonthTrendBarsProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
          dy={4}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={
                d.current
                  ? "var(--color-accent)"
                  : "var(--color-surface-raised)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
