"use client";

import { Repeat } from "lucide-react";
import type { Category } from "@/lib/db";
import type { CalendarDay, CalendarMonth } from "@/lib/calendar";
import { formatYen } from "@/lib/utils";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

interface CalendarGridProps {
  month: CalendarMonth;
  categoryMap: Map<string, Category>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}

/** その日の都度支出のカテゴリ色（重複排除・最大4色）。 */
function dayDotColors(
  day: CalendarDay,
  categoryMap: Map<string, Category>,
): string[] {
  const colors: string[] = [];
  for (const e of day.expenses) {
    const color = categoryMap.get(e.categoryId)?.color ?? "#5C6678";
    if (!colors.includes(color)) colors.push(color);
  }
  return colors.slice(0, 4);
}

export function CalendarGrid({
  month,
  categoryMap,
  selectedDate,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div>
      {/* 曜日見出し */}
      <div className="grid grid-cols-7 text-center text-xs text-text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5">
            {w}
          </div>
        ))}
      </div>

      {/* 日グリッド */}
      <div className="grid grid-cols-7">
        {month.weeks.flat().map((day, i) => {
          if (!day) return <div key={`pad-${i}`} aria-hidden />;

          const selected = day.date === selectedDate;
          const dots = dayDotColors(day, categoryMap);
          const hasSub = day.subCharges.length > 0;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day.date)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-16 flex-col items-center gap-1 rounded-xl px-0.5 pt-1.5 pb-1 text-center outline-none transition-colors",
                "hover:bg-surface focus-visible:bg-surface",
                selected && "bg-surface ring-1 ring-accent",
              )}
            >
              <span
                className={cn(
                  "text-sm tabular-nums",
                  day.isToday
                    ? "font-semibold text-accent"
                    : "text-text-primary",
                )}
              >
                {day.day}
              </span>

              {/* マーカー: カテゴリ色ドット + サブスク課金アイコン */}
              <span className="flex h-3 items-center justify-center gap-0.5">
                {dots.map((color, di) => (
                  <span
                    key={di}
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
                {hasSub && <Repeat size={11} className="text-accent" />}
              </span>

              <span className="text-[10px] leading-tight text-text-muted tabular-nums">
                {day.total > 0 ? formatYen(day.total) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
