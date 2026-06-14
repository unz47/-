"use client";

import type { Category, Expense } from "@/lib/db";
import { formatYen } from "@/lib/utils";
import { formatDayHeader } from "@/lib/date";
import { Card } from "@/components/ui/card";

interface ExpenseListProps {
  expenses: Expense[];
  categoryMap: Map<string, Category>;
  onEdit: (expense: Expense) => void;
}

interface DayGroup {
  date: string;
  total: number;
  items: Expense[];
}

/** 日付ごとにまとめ、新しい日付順 → 同日内は作成順で並べる。 */
function groupByDay(expenses: Expense[]): DayGroup[] {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items,
      total: items.reduce((acc, x) => acc + x.amount, 0),
    }));
}

export function ExpenseList({
  expenses,
  categoryMap,
  onEdit,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <p className="px-1 py-10 text-center text-sm text-text-muted">
        この月の支出はまだありません。
      </p>
    );
  }

  const groups = groupByDay(expenses);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.date}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-medium text-text-secondary">
              {formatDayHeader(group.date)}
            </h2>
            <span className="text-sm text-text-muted tabular-nums">
              {formatYen(group.total)}
            </span>
          </div>

          <Card className="divide-y divide-border overflow-hidden">
            {group.items.map((e) => {
              const cat = categoryMap.get(e.categoryId);
              const title = e.memo ?? cat?.name ?? "支出";
              const subtitle = e.memo ? cat?.name : undefined;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEdit(e)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-raised"
                >
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
                </button>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
