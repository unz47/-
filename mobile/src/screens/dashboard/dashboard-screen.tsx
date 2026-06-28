import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { monthSummary, toMonthKey } from "@/shared/lib/aggregate";
import { formatMonthLabel } from "@/shared/lib/date";
import { formatYen } from "@/shared/lib/money";

/**
 * ダッシュボード（PROJECT_PLAN §6）。
 * 現状はデータ層接続前のプレースホルダ（空配列で合算ロジックを動かし、テーマと移植ロジックの
 * 動作確認を兼ねる）。次フェーズ（SQLite/Drizzle + ストア）で実データに差し替える。
 */
export function DashboardScreen() {
  const ym = toMonthKey(new Date());
  const summary = monthSummary([], [], ym);

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-12 pt-4">
        <Text className="text-sm text-text-secondary">{formatMonthLabel(ym)}</Text>
        <Text className="text-base font-semibold text-text-primary">支出管理</Text>

        <View className="gap-1 rounded-2xl border border-border bg-surface-raised p-5">
          <Text className="text-sm text-text-secondary">当月総支出</Text>
          <Text className="text-4xl font-bold text-accent">
            {formatYen(summary.total)}
          </Text>
          <Text className="text-xs text-text-muted">
            都度 {formatYen(summary.expenseTotal)} ／ サブスク{" "}
            {formatYen(summary.subscriptionActual)}
          </Text>
        </View>

        <View className="rounded-xl border border-border bg-surface p-4">
          <Text className="text-xs text-text-secondary">
            NativeWind + Midnight Ledger 動作確認。データ層は次フェーズで接続。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
