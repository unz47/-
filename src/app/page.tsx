"use client";

import { useMemo } from "react";
import { parseISO, subMonths } from "date-fns";
import {
  categoryBreakdown,
  monthSummary,
  recentMonthTotals,
  toMonthKey,
} from "@/lib/aggregate";
import { formatYen } from "@/lib/utils";
import { formatMonthShort } from "@/lib/date";
import {
  useCategoryMap,
  useExpenses,
  useExpenseStore,
} from "@/store/useExpenseStore";
import { useSubscriptions } from "@/store/useSubscriptionStore";
import { Card } from "@/components/ui/card";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  CategoryDonut,
  type DonutSlice,
} from "@/components/charts/category-donut";
import {
  MonthTrendBars,
  type TrendBar,
} from "@/components/charts/month-trend-bars";

export default function HomePage() {
  const currentMonth = useExpenseStore((s) => s.currentMonth);
  const setCurrentMonth = useExpenseStore((s) => s.setCurrentMonth);

  const expenses = useExpenses();
  const subs = useSubscriptions();
  const categoryMap = useCategoryMap();

  const exp = useMemo(() => expenses ?? [], [expenses]);
  const sub = useMemo(() => subs ?? [], [subs]);

  const summary = useMemo(
    () => monthSummary(exp, sub, currentMonth),
    [exp, sub, currentMonth],
  );

  // 前月比（赤=値上げ専用のため、ここはニュートラル色＋矢印で表現）
  const prevTotal = useMemo(() => {
    const prev = toMonthKey(subMonths(parseISO(`${currentMonth}-01`), 1));
    return monthSummary(exp, sub, prev).total;
  }, [exp, sub, currentMonth]);
  const delta = summary.total - prevTotal;

  // カテゴリ別内訳（凡例 + ドーナツ）
  const slices: DonutSlice[] = useMemo(() => {
    return categoryBreakdown(exp, sub, currentMonth).map((b) => {
      const cat = categoryMap.get(b.categoryId);
      return {
        id: b.categoryId,
        name: cat?.name ?? "不明",
        value: b.amount,
        color: cat?.color ?? "#5C6678",
      };
    });
  }, [exp, sub, currentMonth, categoryMap]);

  // 月推移（直近6ヶ月）
  const trend: TrendBar[] = useMemo(() => {
    const base = parseISO(`${currentMonth}-01`);
    return recentMonthTotals(exp, sub, base, 6).map((m) => ({
      label: formatMonthShort(m.ym),
      total: m.total,
      current: m.ym === currentMonth,
    }));
  }, [exp, sub, currentMonth]);

  return (
    <div className="px-5 pt-safe">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
          <p className="mt-1.5 text-sm text-text-muted">今月の支出サマリー</p>
        </div>
      </header>

      {/* ヒーロー: 当月の総支出 */}
      <Card className="mb-5 p-5">
        <p className="text-sm text-text-secondary">
          当月の総支出（都度＋サブスク）
        </p>
        <p className="mt-1 text-4xl font-bold text-accent tabular-nums">
          {formatYen(summary.total)}
        </p>
        <div className="mt-4 flex items-center gap-5">
          <div>
            <p className="text-xs text-text-muted">サブスク（当月請求）</p>
            <p className="text-base font-semibold tabular-nums">
              {formatYen(summary.subscriptionActual)}
            </p>
            <p className="text-[11px] text-text-muted tabular-nums">
              月額換算 {formatYen(summary.subscriptionMonthly)}
            </p>
          </div>
          <div className="h-7 w-px bg-border" />
          <div>
            <p className="text-xs text-text-muted">前月比</p>
            <p className="text-base font-semibold tabular-nums text-text-secondary">
              {delta === 0
                ? "±0"
                : `${delta > 0 ? "▲" : "▼"} ${formatYen(Math.abs(delta))}`}
            </p>
          </div>
        </div>
      </Card>

      {/* カテゴリ別支出 */}
      <Card className="mb-5 p-5">
        <h2 className="mb-4 font-semibold">カテゴリ別支出</h2>
        {slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            この月の支出はまだありません。
          </p>
        ) : (
          <div className="flex items-center gap-5">
            <CategoryDonut
              data={slices}
              total={summary.total}
              centerLabel={formatMonthShort(currentMonth)}
            />
            <ul className="flex-1 space-y-2.5">
              {slices.map((s) => {
                const pct =
                  summary.total > 0
                    ? Math.round((s.value / summary.total) * 100)
                    : 0;
                return (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-text-secondary">{s.name}</span>
                    <span className="ml-auto text-text-muted tabular-nums">
                      {pct}% {formatYen(s.value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>

      {/* 月推移 */}
      <Card className="p-5">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="font-semibold">月推移</h2>
          <span className="text-xs text-text-muted">直近6ヶ月</span>
        </div>
        <MonthTrendBars data={trend} />
      </Card>
    </div>
  );
}
