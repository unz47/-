import { addDays, parseISO, set } from "date-fns";

import type { Subscription } from "@/shared/db/types";
import { upcomingBillingDates } from "@/shared/lib/billing";
import { formatShortDate } from "@/shared/lib/date";

/**
 * 更新リマインドの計画（純ロジック）。どのサブスクの、いつの請求を、何時に通知するかを決める。
 * 実際の登録は renewal-reminders.ts（expo-notifications）が行う。
 * 本文に**金額は載せない**（ロック画面に財務情報を出さない方針。週次通知と同じ）。
 */

/** all=すべての更新 / yearlyAndTrial=年額の更新と無料体験の終了だけ（月額の毎月通知を避ける）。 */
export type ReminderScope = "all" | "yearlyAndTrial";

export interface PlannedReminder {
  /** 通知 identifier。同じ請求は同じ key になる（再登録＝上書き）。 */
  key: string;
  fireAt: Date;
  title: string;
  body: string;
}

export interface RenewalPlanOptions {
  /** 請求日の何日前に通知するか。 */
  daysBefore: number;
  scope: ReminderScope;
  /** 通知時刻（時）。既定 9 時。 */
  hour?: number;
  /** 登録上限。iOS の保留通知は 64 件までなので余裕を残す。 */
  limit?: number;
}

export const RENEWAL_ID_PREFIX = "renewal-";

function whenLabel(daysBefore: number): string {
  if (daysBefore <= 0) return "今日";
  if (daysBefore === 1) return "明日";
  return `${daysBefore}日後`;
}

export function planRenewalReminders(
  subs: Subscription[],
  now: Date,
  { daysBefore, scope, hour = 9, limit = 48 }: RenewalPlanOptions,
): PlannedReminder[] {
  const when = whenLabel(daysBefore);
  const out: PlannedReminder[] = [];

  for (const s of subs) {
    if (s.canceledAt) continue;
    // 月額は先 12 回ぶん登録しておく（しばらくアプリを開かなくても通知が途切れない）。
    const count = s.billingCycle === "yearly" ? 2 : 12;
    for (const date of upcomingBillingDates(s, now, count)) {
      const isTrialEnd = s.trialEndsAt === date;
      if (
        scope === "yearlyAndTrial" &&
        s.billingCycle !== "yearly" &&
        !isTrialEnd
      ) {
        continue;
      }
      const fireAt = set(addDays(parseISO(date), -daysBefore), {
        hours: hour,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      if (fireAt <= now) continue;

      const day = formatShortDate(date);
      out.push({
        key: `${RENEWAL_ID_PREFIX}${s.id}-${date}`,
        fireAt,
        title: isTrialEnd
          ? "無料体験がまもなく終了します"
          : "サブスクの更新が近づいています",
        body: isTrialEnd
          ? `${s.serviceName} の無料体験は${when}（${day}）に終了し、課金が始まります。`
          : `${s.serviceName}${
              s.billingCycle === "yearly" ? "（年額）" : ""
            } の更新日は${when}（${day}）です。`,
      });
    }
  }

  return out
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, limit);
}
