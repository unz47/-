import { differenceInDays, parseISO } from "date-fns";
import type { SubscriptionChangeLog } from "./db";

/**
 * サブスク改定ログの表示分類（PROJECT_PLAN §6）。
 * 増額=値上げ(danger)、減額=値下げ(success)、プラン変更=中立、契約開始=accent。
 */
export type ChangeKind = "raise" | "cut" | "plan" | "start";

export function classifyLog(log: SubscriptionChangeLog): ChangeKind {
  if (log.field === "planName") return "plan";
  return Number(log.newValue) > Number(log.oldValue) ? "raise" : "cut";
}

/** 増額（値上げ）か。 */
export function isRaise(log: SubscriptionChangeLog): boolean {
  return (
    log.field === "amount" && Number(log.newValue) > Number(log.oldValue)
  );
}

/** 直近 withinDays 日以内の増額か（一覧の「改定あり」バッジ用）。 */
export function isRecentRaise(
  log: SubscriptionChangeLog,
  now: Date,
  withinDays = 30,
): boolean {
  return (
    isRaise(log) && differenceInDays(now, parseISO(log.changedAt)) <= withinDays
  );
}
