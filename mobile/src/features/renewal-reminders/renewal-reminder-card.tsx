import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";

import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { useThemeColors } from "@/shared/config/theme";
import {
  DEFAULT_RENEWAL_REMINDER,
  getRenewalReminderSettings,
  setRenewalReminderSettings,
  type RenewalReminderSettings,
} from "@/shared/db/settings";
import type { ReminderScope } from "@/shared/notifications/renewal-plan";
import {
  disableRenewalReminders,
  enableRenewalReminders,
  refreshRenewalReminders,
} from "@/shared/notifications/renewal-reminders";
import { Card } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";

const DAYS_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: "前日" },
  { days: 3, label: "3日前" },
  { days: 7, label: "7日前" },
];

const SCOPE_OPTIONS: { scope: ReminderScope; label: string }[] = [
  { scope: "yearlyAndTrial", label: "年額と無料体験" },
  { scope: "all", label: "すべての更新" },
];

/** 設定: サブスク更新リマインド（請求日の N 日前 9:00 に端末内通知。本文に金額は載せない）。 */
export function RenewalReminderCard() {
  const subs = useSubscriptions();
  const colors = useThemeColors();
  const [settings, setSettings] = useState<RenewalReminderSettings>(
    DEFAULT_RENEWAL_REMINDER,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRenewalReminderSettings().then(setSettings);
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const { daysBefore, scope } = settings;
      if (settings.enabled) {
        await disableRenewalReminders({ daysBefore, scope });
        setSettings({ ...settings, enabled: false });
      } else if (
        (await enableRenewalReminders(subs, { daysBefore, scope })) === "ok"
      ) {
        setSettings({ ...settings, enabled: true });
      } else {
        Alert.alert(
          "通知が許可されていません",
          "端末の設定アプリから、このアプリの通知を許可してください。",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function update(next: RenewalReminderSettings) {
    setSettings(next);
    await setRenewalReminderSettings(next);
    await refreshRenewalReminders(subs);
  }

  const when =
    DAYS_OPTIONS.find((o) => o.days === settings.daysBefore)?.label ??
    `${settings.daysBefore}日前`;

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-text-secondary">
            サブスクの更新リマインド
          </Text>
          <Text className="text-xs text-text-muted">
            {settings.scope === "all" ? "すべての更新" : "年額の更新と無料体験の終了"}
            を、請求日の{when} 9:00 に通知します（端末内のみ・本文に金額は載せません）。
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.surfaceRaised}
          accessibilityLabel="サブスクの更新リマインド"
        />
      </View>
      {settings.enabled && (
        <View className="gap-2 pt-1">
          <View className="flex-row flex-wrap gap-2">
            {DAYS_OPTIONS.map((o) => (
              <Chip
                key={o.days}
                label={o.label}
                active={settings.daysBefore === o.days}
                onPress={() => update({ ...settings, daysBefore: o.days })}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {SCOPE_OPTIONS.map((o) => (
              <Chip
                key={o.scope}
                label={o.label}
                active={settings.scope === o.scope}
                onPress={() => update({ ...settings, scope: o.scope })}
              />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
