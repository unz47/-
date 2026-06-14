"use client";

import { useMemo, useState } from "react";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { toMonthKey } from "@/lib/aggregate";
import { buildCalendarMonth } from "@/lib/calendar";
import { formatMonthLabel } from "@/lib/date";
import { formatYen } from "@/lib/utils";
import {
  useCategoryMap,
  useExpenses,
  useExpenseStore,
} from "@/store/useExpenseStore";
import { useSubscriptions } from "@/store/useSubscriptionStore";
import { Card } from "@/components/ui/card";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { DayDetail } from "@/components/calendar/day-detail";

export default function CalendarPage() {
  const currentMonth = useExpenseStore((s) => s.currentMonth);
  const setCurrentMonth = useExpenseStore((s) => s.setCurrentMonth);

  const expenses = useExpenses();
  const subs = useSubscriptions();
  const categoryMap = useCategoryMap();

  const exp = useMemo(() => expenses ?? [], [expenses]);
  const sub = useMemo(() => subs ?? [], [subs]);
  // 「今日」はマウント時に固定（再レンダーで揺れないように）
  const today = useMemo(() => new Date(), []);
  const todayMonth = toMonthKey(today);

  const month = useMemo(
    () => buildCalendarMonth(exp, sub, currentMonth, today),
    [exp, sub, currentMonth, today],
  );

  // 選択日: 当月を見ているときは今日、別月なら 1 日を既定にする
  const defaultDate = useMemo(
    () =>
      currentMonth === todayMonth
        ? format(today, "yyyy-MM-dd")
        : `${currentMonth}-01`,
    [currentMonth, todayMonth, today],
  );
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  // 月が変わったら選択日を既定（今日 or 1日）へ戻す（レンダー時に調整）。
  const [prevDefault, setPrevDefault] = useState(defaultDate);
  if (defaultDate !== prevDefault) {
    setPrevDefault(defaultDate);
    setSelectedDate(defaultDate);
  }

  const selectedDay =
    month.days.find((d) => d.date === selectedDate) ?? null;

  const shiftMonth = (delta: number) => {
    const base = parseISO(`${currentMonth}-01`);
    setCurrentMonth(toMonthKey(delta < 0 ? subMonths(base, 1) : addMonths(base, 1)));
  };

  return (
    <div className="px-5 pt-14">
      {/* 月ナビゲーション */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="前の月"
            className="rounded-full p-1 text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold tabular-nums">
            {formatMonthLabel(currentMonth)}
          </h1>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="次の月"
            className="rounded-full p-1 text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            <ChevronRight size={22} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCurrentMonth(todayMonth)}
          className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary outline-none transition-colors hover:bg-surface focus-visible:bg-surface"
        >
          今月
        </button>
      </header>

      {/* ヒーロー: 当月の実請求合計 */}
      <Card className="mb-5 p-5">
        <p className="text-sm text-text-secondary">当月の支出（実請求）</p>
        <p className="mt-1 text-4xl font-bold text-accent tabular-nums">
          {formatYen(month.total)}
        </p>
        <p className="mt-2 text-sm text-text-muted tabular-nums">
          都度 {formatYen(month.expenseTotal)}
          <span className="mx-1.5">・</span>
          サブスク {formatYen(month.subscriptionTotal)}
        </p>
      </Card>

      {/* カレンダー */}
      <div className="mb-5">
        <CalendarGrid
          month={month}
          categoryMap={categoryMap}
          selectedDate={selectedDate}
          onSelectDay={setSelectedDate}
        />
      </div>

      {/* 選択日の内訳 */}
      <DayDetail day={selectedDay} categoryMap={categoryMap} />

      {/* 凡例 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-text-muted" />
          カテゴリ別支出
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat size={12} className="text-accent" />
          サブスク課金
        </span>
      </div>
    </div>
  );
}
