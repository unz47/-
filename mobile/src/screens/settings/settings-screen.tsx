import { useColorScheme } from "nativewind";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCategories } from "@/entities/category/model/use-categories";
import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useSubscriptions } from "@/entities/subscription/model/use-subscriptions";
import { clearAllData } from "@/shared/db/maintenance";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

const THEME_OPTIONS = [
  { key: "system", label: "システム" },
  { key: "light", label: "ライト" },
  { key: "dark", label: "ダーク" },
] as const;

/** 設定（PROJECT_PLAN §6）。テーマ切替・データ件数・全削除。バックアップは実機検証フェーズで追加。 */
export function SettingsScreen() {
  const expenses = useExpenses();
  const subs = useSubscriptions();
  const cats = useCategories();
  const { colorScheme, setColorScheme } = useColorScheme();

  function confirmClear() {
    // 赤(danger)は値上げ専用のため、破壊操作でもテーマの赤は使わない（§3）。
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
            {THEME_OPTIONS.map((o) => {
              const active = (colorScheme ?? "system") === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setColorScheme(o.key)}
                  className={cn(
                    "flex-1 items-center rounded-xl border py-2.5",
                    active
                      ? "border-accent bg-accent/15"
                      : "border-border bg-surface-raised",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm",
                      active ? "text-accent" : "text-text-secondary",
                    )}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

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
