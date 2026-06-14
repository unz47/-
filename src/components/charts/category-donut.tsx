"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatYen } from "@/lib/utils";

export interface DonutSlice {
  id: string; // categoryId（React key 用の安定した一意値）
  name: string;
  value: number;
  color: string;
}

interface CategoryDonutProps {
  data: DonutSlice[];
  total: number;
  centerLabel: string; // 例: "6月"
  size?: number;
}

/** カテゴリ別支出のドーナツ。中央に当月ラベルと総額を重ねる。 */
export function CategoryDonut({
  data,
  total,
  centerLabel,
  size = 132,
}: CategoryDonutProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-text-muted">{centerLabel}</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatYen(total)}
        </span>
      </div>
    </div>
  );
}
