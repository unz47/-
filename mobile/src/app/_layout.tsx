import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";

import { useDatabaseReady } from "@/shared/db/use-database";
import { useThemeColors } from "@/shared/config/theme";
import "@/global.css";

type IoniconName = keyof typeof Ionicons.glyphMap;
const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  // ブランド既定はダーク（Midnight Ledger）。切替は設定タブから。
  // ※起動ごとにダークへ戻る（スキーマ設定の永続化は今後 settings テーブルに保存）。
  useEffect(() => {
    setColorScheme("dark");
  }, [setColorScheme]);

  const colors = useThemeColors();
  // DB（マイグレーション→シード）の準備が済むまで描画を待つ。
  const { ready, error } = useDatabaseReady();

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-base px-6">
        <Text className="text-danger">データベースの初期化に失敗しました</Text>
        <Text className="text-xs text-text-muted">{error.message}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "ホーム", tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="expenses"
        options={{ title: "支出", tabBarIcon: icon("receipt-outline") }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{ title: "サブスク", tabBarIcon: icon("repeat-outline") }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: "カレンダー", tabBarIcon: icon("calendar-outline") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "設定", tabBarIcon: icon("settings-outline") }}
      />
    </Tabs>
  );
}
