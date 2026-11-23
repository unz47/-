import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
} from "date-fns";

import type { Subscription } from "@/shared/db/types";
import { monthlyEquivalent, toMonthKey } from "@/shared/lib/aggregate";
import { subscriptionChargeDay } from "@/shared/lib/calendar";

/**
 * サブスクの請求スケジュール（次回請求日・今後の請求予定・年間コスト・累計支払い）。
 * 月次集計（aggregate.ts）と同じ「当月実請求」ルールを日付軸に展開するだけの純ロジックで、
 * Expense に実体は作らない（§10）。金額は円・整数のまま扱う。
 */

/** Date → "YYYY-MM-DD"（端末ローカル日付）。 */
export function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// 年額でも 1 年以上先まで拾えるよう、探索は 14 ヶ月先まで。
const SEARCH_MONTHS = 14;

/**
 * today 以降の請求日を近い順に最大 count 件返す（YYYY-MM-DD）。
 * 契約開始前の日付は含めず、解約日より後は打ち切る。
 */
export function upcomingBillingDates(
  s: Subscription,
  today: Date,
  count = 1,
): string[] {
  const todayStr = toDateStr(today);
  const from = s.startedAt > todayStr ? s.startedAt : todayStr;
  const first = parseISO(`${from.slice(0, 7)}-01`);
  const out: string[] = [];
  for (let i = 0; i < SEARCH_MONTHS && out.length < count; i++) {
    const ym = toMonthKey(addMonths(first, i));
    const day = subscriptionChargeDay(s, ym);
    if (day === null) continue;
    const date = `${ym}-${String(day).padStart(2, "0")}`;
    if (date < from) continue;
    if (s.canceledAt && date > s.canceledAt) break;
    out.push(date);
  }
  return out;
}

/** 次回請求日（YYYY-MM-DD）。請求予定が無ければ null。 */
export function nextBillingDate(s: Subscription, today: Date): string | null {
  return upcomingBillingDates(s, today, 1)[0] ?? null;
}

/** today から date（YYYY-MM-DD）までの日数。今日なら 0。 */
export function daysUntil(date: string, today: Date): number {
  return differenceInCalendarDays(parseISO(date), today);
}

/** 「今日」「明日」「あとN日」。 */
export function formatDaysLeft(days: number): string {
  if (days <= 0) return "今日";
  if (days === 1) return "明日";
  return `あと${days}日`;
}

export interface UpcomingCharge {
  subscription: Subscription;
  date: string; // YYYY-MM-DD
  amount: number; // その請求 1 回の実額
  daysLeft: number;
}

/** today から days 日以内の請求予定（日付の近い順、同日は金額の大きい順）。 */
export function upcomingCharges(
  subs: Subscription[],
  today: Date,
  days = 30,
): UpcomingCharge[] {
  const limit = toDateStr(addDays(today, days));
  const out: UpcomingCharge[] = [];
  for (const s of subs) {
    // days が 1 ヶ月を超える指定でも取りこぼさないよう、月数ぶん先読みする。
    const count = Math.ceil(days / 28) + 1;
    for (const date of upcomingBillingDates(s, today, count)) {
      if (date > limit) break;
      out.push({
        subscription: s,
        date,
        amount: s.amount,
        daysLeft: daysUntil(date, today),
      });
    }
  }
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || b.amount - a.amount,
  );
}

/** 年間コスト。月額は 12 回ぶん、年額はそのまま。 */
export function yearlyCost(s: Subscription): number {
  return s.billingCycle === "yearly" ? s.amount : s.amount * 12;
}

/** 契約月数（開始月を 1 ヶ月目と数える）。開始前は 0。 */
export function monthsSubscribed(s: Subscription, today: Date): number {
  const todayStr = toDateStr(today);
  const end = s.canceledAt && s.canceledAt < todayStr ? s.canceledAt : todayStr;
  if (s.startedAt > end) return 0;
  return differenceInCalendarMonths(parseISO(end), parseISO(s.startedAt)) + 1;
}

/**
 * 契約開始からの累計支払い（概算）。現在の金額で過去月を数えるため、途中で改定があった
 * 契約では実額とずれる（表示側で「概算」と明示する）。過去月は月次集計と同じく丸ごと数え、
 * 当月以降はその請求日が到来済みのものだけ数える。
 */
export function lifetimePaid(s: Subscription, today: Date): number {
  const todayStr = toDateStr(today);
  const end = s.canceledAt && s.canceledAt < todayStr ? s.canceledAt : todayStr;
  if (s.startedAt > end) return 0;
  const first = parseISO(`${s.startedAt.slice(0, 7)}-01`);
  const months =
    differenceInCalendarMonths(parseISO(end), parseISO(s.startedAt)) + 1;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const ym = toMonthKey(addMonths(first, i));
    const day = subscriptionChargeDay(s, ym);
    if (day === null) continue;
    const date = `${ym}-${String(day).padStart(2, "0")}`;
    if (date <= end) total += s.amount;
  }
  return total;
}

/** 無料体験中か（終了日＝初回請求日より前）。 */
export function isInTrial(s: Subscription, today: Date): boolean {
  return !!s.trialEndsAt && !s.canceledAt && toDateStr(today) < s.trialEndsAt;
}

export type SubscriptionSort = "next" | "amount" | "name";

/** 一覧の並び替え。next=次回請求日が近い順 / amount=月額換算が高い順 / name=名前順。 */
export function sortSubscriptions(
  subs: Subscription[],
  mode: SubscriptionSort,
  today: Date,
): Subscription[] {
  const copy = [...subs];
  if (mode === "amount") {
    return copy.sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
  }
  if (mode === "name") {
    return copy.sort((a, b) => a.serviceName.localeCompare(b.serviceName, "ja"));
  }
  const key = (s: Subscription) => nextBillingDate(s, today) ?? "9999-12-31";
  return copy.sort(
    (a, b) =>
      key(a).localeCompare(key(b)) ||
      monthlyEquivalent(b) - monthlyEquivalent(a),
  );
}
