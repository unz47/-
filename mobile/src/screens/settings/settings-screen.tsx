import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategories } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import {
  exportBackup,
  importBackup,
} from "@/features/backup-restore/backup-restore";
import { exportExpensesCsv } from "@/features/backup-restore/csv-export";
import { BudgetSettingCard } from "@/features/budget/budget-setting-card";
import { AddCategorySheet } from "@/features/manage-categories/add-category-sheet";
import { useThemeColors } from "@/shared/config/theme";
import { clearAllData } from "@/shared/db/maintenance";
import {
  DEFAULT_WEEKLY_INSIGHT_SCHEDULE,
  getWeeklyInsightSchedule,
  setThemePreference,
  setWeeklyInsightSchedule,
  type ThemePreference,
  type WeeklyInsightSchedule,
} from "@/shared/db/settings";
import { hapticWarning } from "@/shared/lib/haptics";
import {
  disableWeeklyInsight,
  enableWeeklyInsight,
  isWeeklyInsightEnabled,
  rescheduleWeeklyInsight,
} from "@/shared/notifications/weekly-insight";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Chip } from "@/shared/ui/chip";

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "システム" },
  { key: "light", label: "ライト" },
  { key: "dark", label: "ダーク" },
];

// weekday は Apple DateComponents 準拠（1=日曜 … 7=土曜）。index+1 が weekday。
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

/** 設定（PROJECT_PLAN §6）。テーマ・月予算・通知・バックアップ/CSV・全削除。 */
export function SettingsScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const cats = useCategories();
  const { colorScheme, setColorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [schedule, setSchedule] = useState<WeeklyInsightSchedule>(
    DEFAULT_WEEKLY_INSIGHT_SCHEDULE,
  );
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    isWeeklyInsightEnabled().then(setNotifyOn);
    getWeeklyInsightSchedule().then(setSchedule);
  }, []);

  async function pickSchedule(next: WeeklyInsightSchedule) {
    setSchedule(next);
    await setWeeklyInsightSchedule(next);
    // 有効時は新しいタイミングで登録し直す（無効時は保存だけ＝次回ONで反映）。
    if (notifyOn) await rescheduleWeeklyInsight(expenses);
  }

  function pickTheme(t: ThemePreference) {
    setColorScheme(t);
    // 次回起動でも保持（app_settings。失敗しても表示は既に切り替わっている）
    setThemePreference(t).catch(() => {});
  }

  async function toggleNotify() {
    if (busy) return;
    setBusy(true);
    try {
      if (notifyOn) {
        await disableWeeklyInsight();
        setNotifyOn(false);
      } else {
        const r = await enableWeeklyInsight(expenses);
        if (r === "denied") {
          Alert.alert(
            "通知が許可されていません",
            "端末の設定アプリから、このアプリの通知を許可してください。",
          );
        } else {
          setNotifyOn(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (busy) return;
    setBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert("エクスポート失敗", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onExportCsv() {
    if (busy) return;
    setBusy(true);
    try {
      await exportExpensesCsv();
    } catch (e) {
      Alert.alert("CSV出力失敗", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onImport() {
    Alert.alert(
      "バックアップから復元",
      "現在のデータはすべて置き換えられます。続けますか？",
      [
        { text: "閉じる", style: "cancel" },
        {
          text: "ファイルを選ぶ",
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            const r = await importBackup();
            setBusy(false);
            if (r.status === "ok") Alert.alert("完了", "復元しました。");
            else if (r.status === "error")
              Alert.alert("復元失敗", r.message);
          },
        },
      ],
    );
  }

  function confirmClear() {
    // 赤(danger)は値上げ専用のため、破壊操作でもテーマの赤は使わない（§3）。
    hapticWarning();
    Alert.alert(
      "全データ削除",
      "すべての支出・サブスクを削除し、初期状態に戻します。元に戻せません。",
      [
        { text: "閉じる", style: "cancel" },
        { text: "削除する", style: "destructive", onPress: () => clearAllData() },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-12 pt-4">
        <Text className="text-xl font-bold text-text-primary">設定</Text>

        <Card className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            テーマ
          </Text>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map((o) => (
              <View key={o.key} className="flex-1">
                <Chip
                  label={o.label}
                  active={(colorScheme ?? "system") === o.key}
                  onPress={() => pickTheme(o.key)}
                />
              </View>
            ))}
          </View>
        </Card>

        <BudgetSettingCard />

        <Card className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            データ
          </Text>
          <Row label="支出" value={`${expenses.length} 件`} />
          <Row label="サブスク" value={`${subs.length} 件`} />
          <Row label="カテゴリ" value={`${cats.length} 件`} />
        </Card>

        <Card className="gap-2">
          <Text className="text-sm font-semibold text-text-secondary">
            カテゴリ
          </Text>
          {cats.map((c) => (
            <View key={c.id} className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <Text className="text-sm text-text-primary">{c.name}</Text>
            </View>
          ))}
          <Button
            label="＋ カテゴリを追加"
            variant="ghost"
            onPress={() => setAddingCategory(true)}
          />
        </Card>

        <Card className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold text-text-secondary">
                週次の振り返り通知
              </Text>
              <Text className="text-xs text-text-muted">
                毎週{WEEKDAY_LABELS[schedule.weekday - 1]}曜{" "}
                {schedule.hour}:00
                に、直近1週間の使いがち時間帯を通知します（端末内のみ・本文に金額は載せません）。
              </Text>
            </View>
            <Switch
              value={notifyOn}
              onValueChange={toggleNotify}
              disabled={busy}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.surfaceRaised}
              accessibilityLabel="週次の振り返り通知"
            />
          </View>
          {notifyOn && (
            <View className="gap-2 pt-1">
              <View className="flex-row gap-1.5">
                {WEEKDAY_LABELS.map((label, i) => (
                  <View key={label} className="flex-1">
                    <Chip
                      label={label}
                      active={schedule.weekday === i + 1}
                      onPress={() =>
                        pickSchedule({ ...schedule, weekday: i + 1 })
                      }
                    />
                  </View>
                ))}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-1.5 py-0.5"
              >
                {HOUR_OPTIONS.map((h) => (
                  <Chip
                    key={h}
                    label={`${h}時`}
                    active={schedule.hour === h}
                    onPress={() => pickSchedule({ ...schedule, hour: h })}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        <Card className="gap-3">
          <Text className="text-sm font-semibold text-text-secondary">
            バックアップ / 書き出し
          </Text>
          <Text className="text-xs text-text-muted">
            JSON は全データの復元用、CSV は支出のみ（表計算・申告用）。どちらも端末内で生成・外部送信なし。
          </Text>
          <View className="flex-row gap-3">
            <Button
              label="エクスポート"
              variant="ghost"
              onPress={onExport}
              disabled={busy}
              className="flex-1"
            />
            <Button
              label="インポート"
              variant="ghost"
              onPress={onImport}
              disabled={busy}
              className="flex-1"
            />
          </View>
          <Button
            label="CSV書き出し（支出）"
            variant="ghost"
            onPress={onExportCsv}
            disabled={busy}
          />
        </Card>

        <Button label="全データ削除" variant="ghost" onPress={confirmClear} />
      </ScrollView>

      <AddCategorySheet
        visible={addingCategory}
        onClose={() => setAddingCategory(false)}
        existingNames={cats.map((c) => c.name)}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-text-secondary">{label}</Text>
      <Text className="text-sm text-text-primary">{value}</Text>
    </View>
  );
}
