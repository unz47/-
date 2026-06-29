import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** 設定（PROJECT_PLAN §6）。エクスポート/インポート等。後続スライスで実装。 */
export function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-text-secondary">設定</Text>
        <Text className="text-xs text-text-muted">
          バックアップ等は後続スライスで実装
        </Text>
      </View>
    </SafeAreaView>
  );
}
