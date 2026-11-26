import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useThemeColors } from "@/shared/config/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IoniconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

/** 4タブ（ホーム/支出/サブスク/カレンダー）。設定はホーム右上の歯車からスタックで開く。 */
export default function TabsLayout() {
  const colors = useThemeColors();
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
    </Tabs>
  );
}
