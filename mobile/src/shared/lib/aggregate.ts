import {
  endOfMonth,
  format,
  getMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Expense, Subscription } from "@/shared/db/types";

/**
 * 月次支出の合成ロジック（PROJECT_PLAN §4）。
 * サブスクは expenses テーブルに実体を作らず、ここで動的に合算する（二重計上を避ける）。
 * コンポーネントへロジックを散らさず、この 1 ファイルに集約する。
 */

export type MonthKey = string; // "YYYY-MM"

/** 日付（Date or YYYY-MM-DD）から月キー "YYYY-MM" を得る。 */
export function toMonthKey(date: Date | string): MonthKey {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM");
}

/** ym（YYYY-MM）の月初・月末を YYYY-MM-DD で返す。 */
function monthBounds(ym: MonthKey): { start: string; end: string } {
  const base = parseISO(`${ym}-01`);
  return {
    start: format(startOfMonth(base), "yyyy-MM-dd"),
    end: format(endOfMonth(base), "yyyy-MM-dd"),
  };
}

function sumAmount(items: { amount: number }[]): number {
  return items.reduce((acc, x) => acc + x.amount, 0);
}

/** ym（YYYY-MM）の月番号 1-12。 */
function monthOf(ym: MonthKey): number {
  return Number(ym.slice(5, 7));
}

/**
 * サブスクの月額換算（ランニングコスト）。
 * yearly は Math.round(amount / 12)、monthly は amount。円・整数を保つ。
 */
export function monthlyEquivalent(s: Subscription): number {
  return s.billingCycle === "yearly" ? Math.round(s.amount / 12) : s.amount;
}

/** yearly サブスクの請求月（1-12）。billingMonth 優先、無ければ startedAt の月。 */
function yearlyBillingMonth(s: Subscription): number {
  return s.billingMonth ?? getMonth(parseISO(s.startedAt)) + 1;
}

/**
 * ym 月に実際に請求される金額（実キャッシュフロー）。
 * monthly: その月アクティブなら amount。yearly: 請求月に一致する月だけ amount、他月は 0。
 */
export function actualChargeInMonth(s: Subscription, ym: MonthKey): number {
  if (s.billingCycle === "yearly") {
    return yearlyBillingMonth(s) === monthOf(ym) ? s.amount : 0;
  }
  return s.amount;
}

/**
 * その月にアクティブなサブスク（PROJECT_PLAN §4 の条件）:
 * startedAt <= 月末 かつ（canceledAt 未設定 or canceledAt >= 月初）。
 */
export function activeSubsInMonth(
  subs: Subscription[],
  ym: MonthKey,
): Subscription[] {
  const { start, end } = monthBounds(ym);
  return subs.filter(
    (s) => s.startedAt <= end && (!s.canceledAt || s.canceledAt >= start),
  );
}

/** その月に属する都度支出。 */
export function expensesInMonth(expenses: Expense[], ym: MonthKey): Expense[] {
  return expenses.filter((e) => toMonthKey(e.date) === ym);
}

export interface MonthSummary {
  ym: MonthKey;
  expenseTotal: number; // 都度支出の合計
  subscriptionActual: number; // 当月に実際に請求されるサブスク合計（実支出）
  subscriptionMonthly: number; // アクティブなサブスクの月額換算合計（ランニング）
  total: number; // 当月総支出（実支出）= expenseTotal + subscriptionActual
}

/** 当月サマリー（都度＋サブスク）。当月総支出は「当月実請求」基準（§4）。 */
export function monthSummary(
  expenses: Expense[],
  subs: Subscription[],
  ym: MonthKey,
): MonthSummary {
  const active = activeSubsInMonth(subs, ym);
  const expenseTotal = sumAmount(expensesInMonth(expenses, ym));
  const subscriptionActual = active.reduce(
    (acc, s) => acc + actualChargeInMonth(s, ym),
    0,
  );
  const subscriptionMonthly = active.reduce(
    (acc, s) => acc + monthlyEquivalent(s),
    0,
  );
  return {
    ym,
    expenseTotal,
    subscriptionActual,
    subscriptionMonthly,
    total: expenseTotal + subscriptionActual,
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  amount: number;
}

/**
 * 当月のカテゴリ別内訳（都度支出 + サブスクをそれぞれの categoryId に合算）。
 * 金額の降順で返す。
 */
export function categoryBreakdown(
  expenses: Expense[],
  subs: Subscription[],
  ym: MonthKey,
): CategoryBreakdownItem[] {
  const map = new Map<string, number>();
  for (const e of expensesInMonth(expenses, ym)) {
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
  }
  for (const s of activeSubsInMonth(subs, ym)) {
    const amt = actualChargeInMonth(s, ym);
    if (amt > 0) map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + amt);
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthTotal {
  ym: MonthKey;
  total: number;
}

/**
 * base 月を末尾とする直近 count ヶ月の総支出（月推移グラフ用）。
 * 古い月→新しい月の順で返す。
 */
export function recentMonthTotals(
  expenses: Expense[],
  subs: Subscription[],
  base: Date,
  count = 6,
): MonthTotal[] {
  const out: MonthTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = toMonthKey(subMonths(base, i));
    out.push({ ym, total: monthSummary(expenses, subs, ym).total });
  }
  return out;
}
