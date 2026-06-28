import { DarkTheme, ThemeProvider } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { useDatabaseReady } from "@/shared/db/use-database";
import "@/global.css";

export default function RootLayout() {
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
        <ActivityIndicator color="#2dd4bf" />
      </View>
    );
  }

  // Midnight Ledger はダーク固定。
  return (
    <ThemeProvider value={DarkTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
