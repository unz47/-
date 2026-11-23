import * as Notifications from "expo-notifications";

import {
  getRenewalReminderSettings,
  setRenewalReminderSettings,
  type RenewalReminderSettings,
} from "@/shared/db/settings";
import type { Subscription } from "@/shared/db/types";
import { planRenewalReminders, RENEWAL_ID_PREFIX } from "./renewal-plan";

/**
 * サブスク更新リマインド（請求日の N 日前 9:00 にローカル通知）。端末内のみ・外部送信なし。
 * 計画は renewal-plan.ts（純ロジック）、ここは expo-notifications への登録だけを担う。
 * 登録は「renewal- で始まる通知を全部消してから計画どおり入れ直す」冪等な同期方式。
 */

async function cancelAllRenewals(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(RENEWAL_ID_PREFIX))
      .map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
  );
}

async function scheduleAll(
  subs: Subscription[],
  settings: RenewalReminderSettings,
): Promise<number> {
  await cancelAllRenewals();
  const plan = planRenewalReminders(subs, new Date(), {
    daysBefore: settings.daysBefore,
    scope: settings.scope,
  });
  for (const p of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.key,
      content: { title: p.title, body: p.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.fireAt,
      },
    });
  }
  return plan.length;
}

/**
 * 更新リマインドを有効化（権限要求→設定保存→登録）。
 * @returns "ok" | "denied"（通知権限が拒否された）
 */
export async function enableRenewalReminders(
  subs: Subscription[],
  settings: Omit<RenewalReminderSettings, "enabled">,
): Promise<"ok" | "denied"> {
  const perm = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  if (!perm.granted) return "denied";
  const next = { ...settings, enabled: true };
  await setRenewalReminderSettings(next);
  await scheduleAll(subs, next);
  return "ok";
}

/** 更新リマインドを無効化（登録済みも全て取り消す）。 */
export async function disableRenewalReminders(
  settings: Omit<RenewalReminderSettings, "enabled">,
): Promise<void> {
  await setRenewalReminderSettings({ ...settings, enabled: false });
  await cancelAllRenewals();
}

/**
 * 有効なら最新のサブスク内容で登録し直す（起動時・サブスク変更時・設定変更時）。
 * 権限が失効していれば何もしない。通知はベストエフォートで、失敗しても本体に影響させない。
 */
export async function refreshRenewalReminders(
  subs: Subscription[],
): Promise<void> {
  try {
    const settings = await getRenewalReminderSettings();
    if (!settings.enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await scheduleAll(subs, settings);
  } catch {
    // ベストエフォート
  }
}
