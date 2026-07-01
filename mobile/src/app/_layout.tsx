import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";

import { useDatabaseReady } from "@/shared/db/use-database";
import { configureNotificationHandler } from "@/shared/notifications/weekly-insight";
import { useThemeColors } from "@/shared/config/theme";
import "@/global.css";

// テーマ既定はシステム追従（端末の外観に合わせる）。切替は設定タブから。
// 強制設定はしない（再レンダーや Fast Refresh と競合してトグルを戻す不具合の原因になるため）。
// 「選んだテーマを次回起動も保持」は今後 settings テーブルへ永続化して実現する。

type IoniconName = keyof typeof Ionicons.glyphMap;
const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function RootLayout() {
  const colors = useThemeColors();
  // DB（マイグレーション→シード）の準備が済むまで描画を待つ。
  const { ready, error } = useDatabaseReady();

  // 通知をフォアグラウンドでも表示できるようハンドラを一度だけ設定する。
  useEffect(() => {
    configureNotificationHandler();
  }, []);

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
