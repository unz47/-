import { Text, TextInput, type TextInputProps, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";

/**
 * ラベル付きテキスト入力（フォーム共通）。placeholder 色はテーマから取り、
 * 生 HEX の直書きを各フォームから排除する。
 */
interface TextFieldProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label: string;
  className?: string;
}

export function TextField({ label, className, ...props }: TextFieldProps) {
  const colors = useThemeColors();
  return (
    <View className="gap-1">
      <Text className="text-xs text-text-secondary">{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        className={cn(
          "rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary",
          className,
        )}
        {...props}
      />
    </View>
  );
}
