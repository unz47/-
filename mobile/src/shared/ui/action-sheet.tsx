import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import { Button } from "@/shared/ui/button";
import { Sheet } from "@/shared/ui/sheet";

/**
 * アクションシート（OS の Alert.alert の置き換え）。Midnight Ledger の面で描く。
 * 赤は値上げ/超過専用のため、解約・削除などの destructive でも赤は使わない（§3）。
 */
export interface ActionSheetOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
}

// シートの閉じアニメーション後に選択アクションを実行する（モーダル多段の競合回避）。
const AFTER_CLOSE_MS = 220;

export function ActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
}: ActionSheetProps) {
  const colors = useThemeColors();

  function select(option: ActionSheetOption) {
    onClose();
    setTimeout(option.onPress, AFTER_CLOSE_MS);
  }

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={title}>
      <View className="gap-0.5">
        <Text className="text-lg font-bold text-text-primary">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-text-muted">{subtitle}</Text>
        ) : null}
      </View>

      <View className="overflow-hidden rounded-xl border border-border">
        {options.map((o, i) => (
          <Pressable
            key={o.label}
            onPress={() => select(o)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            className={
              "flex-row items-center gap-3 bg-surface-raised px-4 py-3.5 active:opacity-70" +
              (i > 0 ? " border-t border-border" : "")
            }
          >
            {o.icon && (
              <Ionicons name={o.icon} size={18} color={colors.textSecondary} />
            )}
            <Text className="text-base text-text-primary">{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button label="閉じる" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
