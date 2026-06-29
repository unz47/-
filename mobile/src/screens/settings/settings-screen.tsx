import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategories } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { clearAllData } from "@/shared/db/maintenance";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/** 設定（PROJECT_PLAN §6）。バックアップ/復元は実機検証フェーズで追加。 */
export function SettingsScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const cats = useCategories();

  function confirmClear() {
    // 赤(danger)は値上げ専用のため、破壊操作でもテーマの赤は使わない（§3）。
    // OS の destructive スタイル（確認ダイアログ）で警告する。
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
        </Card>

        <Card>
          <Text className="text-xs text-text-muted">
            バックアップ（エクスポート/インポート）は実機検証フェーズで追加予定。
          </Text>
        </Card>

        <Button label="全データ削除" variant="ghost" onPress={confirmClear} />
      </ScrollView>
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
