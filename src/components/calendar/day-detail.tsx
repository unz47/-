"use client";

import { Repeat } from "lucide-react";
import type { Category } from "@/lib/db";
import type { CalendarDay } from "@/lib/calendar";
import { formatYen } from "@/lib/utils";
import { formatFullDay, isTodayStr } from "@/lib/date";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DayDetailProps {
  day: CalendarDay | null;
  categoryMap: Map<string, Category>;
}

export function DayDetail({ day, categoryMap }: DayDetailProps) {
  if (!day) return null;

  const empty = day.expenses.length === 0 && day.subCharges.length === 0;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-text-primary">
          {formatFullDay(day.date)}
        </h2>
        {isTodayStr(day.date) && <Badge variant="accent">今日</Badge>}
        <span className="ml-auto font-semibold text-accent tabular-nums">
          {formatYen(day.total)}
        </span>
      </div>

      {empty ? (
        <p className="py-4 text-center text-sm text-text-muted">
          この日の支出はありません。
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {/* 都度支出 */}
          {day.expenses.map((e) => {
            const cat = categoryMap.get(e.categoryId);
            const title = e.memo ?? cat?.name ?? "支出";
            const subtitle = e.memo ? cat?.name : undefined;
            return (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cat?.color ?? "#5C6678" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-text-primary">
                    {title}
                  </span>
                  {subtitle && (
                    <span className="block truncate text-xs text-text-muted">
                      {subtitle}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatYen(e.amount)}
                </span>
              </li>
            );
          })}

          {/* サブスク課金（自動計上・実体なし） */}
          {day.subCharges.map(({ subscription: s, amount }) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span className="flex size-2.5 shrink-0 items-center justify-center">
                <Repeat size={13} className="text-accent" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-text-primary">
                    {s.serviceName}
                  </span>
                  <Badge variant="muted">自動</Badge>
                </span>
                <span className="block truncate text-xs text-text-muted">
                  {s.planName} ・ サブスク
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatYen(amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
