import * as Notifications from "expo-notifications";

/**
 * 週次インサイト通知（時間帯の振り返りを促す）。全て端末内ローカル通知で、外部送信はしない。
 * 本文には金額を載せない。スケジュール時点のデータに縛られるのを避け、
 * タップして開いた時にダッシュボードで最新の集計を見てもらう設計。
 */

const WEEKLY_INSIGHT_ID = "weekly-time-insight";
// 発火タイミング: 毎週日曜 20:00（週末夜に振り返る）。
// weekday は Apple DateComponents 準拠で 1=日曜 … 7=土曜。
const WEEKDAY_SUNDAY = 1;
const HOUR = 20;
const MINUTE = 0;

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

/** 週次インサイト通知が登録済みか。 */
export async function isWeeklyInsightEnabled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === WEEKLY_INSIGHT_ID);
}

/**
 * 週次インサイト通知を登録（日曜20:00 繰り返し）。固定 identifier なので再登録は上書き。
 * @returns "ok" | "denied"（通知権限が拒否された）
 */
export async function enableWeeklyInsight(): Promise<"ok" | "denied"> {
  const perm = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  if (!perm.granted) return "denied";

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_INSIGHT_ID,
    content: {
      title: "今週の使いがち時間帯",
      body: "先週どの時間帯に使ったか、振り返ってみましょう。",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: WEEKDAY_SUNDAY,
      hour: HOUR,
      minute: MINUTE,
    },
  });
  return "ok";
}

/** 週次インサイト通知を解除。 */
export async function disableWeeklyInsight(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_INSIGHT_ID);
}
