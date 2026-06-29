import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** カレンダー（PROJECT_PLAN §6）。当月実請求を日グリッドに並べる読み取りビュー。後続スライスで実装。 */
export function CalendarScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-text-secondary">カレンダー</Text>
        <Text className="text-xs text-text-muted">後続スライスで実装</Text>
      </View>
    </SafeAreaView>
  );
}
