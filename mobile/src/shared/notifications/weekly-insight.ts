import * as Notifications from "expo-notifications";

import type { Expense } from "@/shared/db/types";
import {
  getWeeklyInsightFlag,
  setWeeklyInsightFlag,
} from "@/shared/db/settings";
import {
  buildTimeOfDayInsight,
  TIME_OF_DAY_LABEL,
  TIME_OF_DAY_RANGE,
} from "@/shared/insights/time-of-day";

/**
 * 週次インサイト通知（時間帯の振り返り＝「支出ラップ」）。全て端末内ローカル通知で外部送信なし。
 * 本文はスケジュール時点の直近7日集計から生成するが、**金額は載せない**
 * （ロック画面に財務情報を出さない方針）。件数と時間帯だけ添え、詳細はタップして
 * ダッシュボードで最新集計を見てもらう。アプリ起動ごとに refreshWeeklyInsight で
 * 本文を最新データに差し替える（固定 identifier なので再登録=上書き）。
 */

const WEEKLY_INSIGHT_ID = "weekly-time-insight";
// 発火タイミング: 毎週日曜 20:00（週末夜に振り返る）。
// weekday は Apple DateComponents 準拠で 1=日曜 … 7=土曜。
const WEEKDAY_SUNDAY = 1;
const HOUR = 20;
const MINUTE = 0;

const FALLBACK_BODY = "先週どの時間帯に使ったか、振り返ってみましょう。";

/** フォアグラウンドでもバナー表示する。アプリ起動時に一度呼ぶ。 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** 直近7日の集計から通知本文を作る（金額は載せない）。 */
export function weeklyInsightBody(expenses: Expense[], now?: Date): string {
  const insight = buildTimeOfDayInsight(expenses, { now });
  if (!insight.peak) return FALLBACK_BODY;
  const label = TIME_OF_DAY_LABEL[insight.peak.bin];
  const range = TIME_OF_DAY_RANGE[insight.peak.bin];
  return `この1週間は${label}（${range}）の支出が最多（${insight.peak.count}件）。タップして詳しく振り返る。`;
}

/** 週次インサイト通知が登録済みか。 */
export async function isWeeklyInsightEnabled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === WEEKLY_INSIGHT_ID);
}

async function schedule(expenses: Expense[]): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_INSIGHT_ID,
    content: {
      title: "今週の使いがち時間帯",
      body: weeklyInsightBody(expenses),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: WEEKDAY_SUNDAY,
      hour: HOUR,
      minute: MINUTE,
    },
  });
}

/**
 * 週次インサイト通知を登録（日曜20:00 繰り返し）。固定 identifier なので再登録は上書き。
 * @returns "ok" | "denied"（通知権限が拒否された）
 */
export async function enableWeeklyInsight(
  expenses: Expense[],
): Promise<"ok" | "denied"> {
  const perm = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  if (!perm.granted) return "denied";

  await schedule(expenses);
  await setWeeklyInsightFlag(true);
  return "ok";
}

/** 週次インサイト通知を解除。 */
export async function disableWeeklyInsight(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_INSIGHT_ID);
  await setWeeklyInsightFlag(false);
}

/**
 * 有効化済みなら、通知本文を最新の直近7日集計で作り直す（起動時に一度呼ぶ）。
 * 権限が失効していたら静かに何もしない（次回トグル時に再要求）。
 */
export async function refreshWeeklyInsight(expenses: Expense[]): Promise<void> {
  try {
    if (!(await getWeeklyInsightFlag())) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await schedule(expenses);
  } catch {
    // 通知はベストエフォート。失敗してもアプリ本体には影響させない。
  }
}
