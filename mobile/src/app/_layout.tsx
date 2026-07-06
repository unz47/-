import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";

import { useExpenses } from "@/entities/expense/model/use-expenses";
import { useDatabaseReady } from "@/shared/db/use-database";
import { getThemePreference } from "@/shared/db/settings";
import {
  configureNotificationHandler,
  refreshWeeklyInsight,
} from "@/shared/notifications/weekly-insight";
import { useThemeColors } from "@/shared/config/theme";
import { Button } from "@/shared/ui/button";
import { ErrorBoundary } from "@/shared/ui/error-boundary";
import "@/global.css";

// 週次通知の本文（直近7日の支出ラップ）を起動ごとに最新データへ差し替える。
// 支出ロード後に一度だけ実行（ライブクエリの再発火では再スケジュールしない）。
function WeeklyInsightRefresher() {
  const expenses = useExpenses();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || expenses.length === 0) return;
    done.current = true;
    refreshWeeklyInsight(expenses);
  }, [expenses]);
  return null;
}

// テーマは app_settings に永続化し、DB 準備完了後に一度だけ復元する
// （毎レンダーで強制すると Fast Refresh と競合してトグルが戻るため、復元は1回限り）。
function useRestoreTheme(ready: boolean): void {
  const { setColorScheme } = useColorScheme();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!ready || restored) return;
    getThemePreference()
      .then((t) => setColorScheme(t))
      .catch(() => {})
      .finally(() => setRestored(true));
  }, [ready, restored, setColorScheme]);
}

type IoniconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IoniconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

/** DB 準備ゲート＋タブ。key を変えて再マウントするとマイグレーション/シードをやり直す。 */
function DatabaseGate({ onRetry }: { onRetry: () => void }) {
  const colors = useThemeColors();
  // DB（マイグレーション→シード）の準備が済むまで描画を待つ。
  const { ready, error } = useDatabaseReady();
  useRestoreTheme(ready);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-base px-6">
        <Text className="text-danger">データベースの初期化に失敗しました</Text>
        <Text className="text-center text-xs text-text-muted">
          {error.message}
        </Text>
        <Button label="再試行" onPress={onRetry} />
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
    <>
      <WeeklyInsightRefresher />
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
    </>
  );
}

export default function RootLayout() {
  const [attempt, setAttempt] = useState(0);

  // 通知をフォアグラウンドでも表示できるようハンドラを一度だけ設定する。
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  return (
    <ErrorBoundary>
      <DatabaseGate
        key={attempt}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </ErrorBoundary>
  );
}
