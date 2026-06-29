import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";

import type { Expense, Subscription } from "@/shared/db/types";
import {
  actualChargeInMonth,
  activeSubsInMonth,
  expensesInMonth,
  type MonthKey,
} from "@/shared/lib/aggregate";

/**
 * カレンダー（読み取り専用ビュー / PROJECT_PLAN §6・§10）。
 * 既存の「当月実請求」集計（aggregate.ts）を時間軸へ並べ替えるだけ。
 * スキーマ変更・新エンティティを作らない＝サブスクは集計時に動的合算する不変条件を維持する。
 */

export interface CalendarSubCharge {
  subscription: Subscription;
  amount: number;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number; // 1-31
  expenses: Expense[];
  subCharges: CalendarSubCharge[];
  total: number;
  isToday: boolean;
}

export interface CalendarMonth {
  ym: MonthKey;
  weeks: (CalendarDay | null)[][];
  days: CalendarDay[];
  expenseTotal: number;
  subscriptionTotal: number;
  total: number;
}

/** ym 月にサブスクが課金される日（1-based, 月末でクランプ）。実請求が無ければ null。 */
export function subscriptionChargeDay(
  s: Subscription,
  ym: MonthKey,
): number | null {
  if (actualChargeInMonth(s, ym) <= 0) return null;
  const daysInMonth = getDaysInMonth(parseISO(`${ym}-01`));
  return Math.min(s.billingDay, daysInMonth);
}

function sumAmount(items: { amount: number }[]): number {
  return items.reduce((acc, x) => acc + x.amount, 0);
}

/** ym 月のカレンダーモデル。月合計は当月実請求基準（monthSummary.total と一致）。 */
export function buildCalendarMonth(
  expenses: Expense[],
  subs: Subscription[],
  ym: MonthKey,
  today: Date,
): CalendarMonth {
  const first = startOfMonth(parseISO(`${ym}-01`));
  const monthExpenses = expensesInMonth(expenses, ym);
  const activeSubs = activeSubsInMonth(subs, ym);

  const expByDate = new Map<string, Expense[]>();
  for (const e of monthExpenses) {
    const arr = expByDate.get(e.date) ?? [];
    arr.push(e);
    expByDate.set(e.date, arr);
  }

  const subByDay = new Map<number, CalendarSubCharge[]>();
  for (const s of activeSubs) {
    const day = subscriptionChargeDay(s, ym);
    if (day === null) continue;
    const arr = subByDay.get(day) ?? [];
    arr.push({ subscription: s, amount: actualChargeInMonth(s, ym) });
    subByDay.set(day, arr);
  }

  const days: CalendarDay[] = eachDayOfInterval({
    start: first,
    end: endOfMonth(first),
  }).map((d) => {
    const date = format(d, "yyyy-MM-dd");
    const day = getDate(d);
    const dayExpenses = expByDate.get(date) ?? [];
    const subCharges = subByDay.get(day) ?? [];
    return {
      date,
      day,
      expenses: dayExpenses,
      subCharges,
      total: sumAmount(dayExpenses) + sumAmount(subCharges),
      isToday: isSameDay(d, today),
    };
  });

  const weeks: (CalendarDay | null)[][] = [];
  let row: (CalendarDay | null)[] = Array<CalendarDay | null>(
    getDay(first),
  ).fill(null);
  for (const d of days) {
    row.push(d);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }

  const expenseTotal = sumAmount(monthExpenses);
  const subscriptionTotal = activeSubs.reduce(
    (acc, s) => acc + actualChargeInMonth(s, ym),
    0,
  );
  return {
    ym,
    weeks,
    days,
    expenseTotal,
    subscriptionTotal,
    total: expenseTotal + subscriptionTotal,
  };
}
