import { Pressable, Text } from "react-native";

import { cn } from "@/shared/lib/cn";
import { hapticLight } from "@/shared/lib/haptics";

/** 選択チップ（カテゴリ・プリセット・プラン等の横スクロール選択肢で共用）。 */
interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className={cn(
        "rounded-full border px-4 py-2",
        active ? "border-accent bg-accent/15" : "border-border bg-surface-raised",
      )}
    >
      <Text
        className={cn("text-sm", active ? "text-accent" : "text-text-secondary")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
