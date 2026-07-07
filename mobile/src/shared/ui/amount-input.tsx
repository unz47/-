import { Text, TextInput, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";

/**
 * 金額入力（円・整数の不変条件をここで守る）。
 * - ¥ プレフィックス＋入力中の 3 桁区切り表示（design-conventions）
 * - 数字以外は捨て、上限 8 桁（¥99,999,999）でクランプ＝負数・超大値を構造的に防ぐ
 */
interface AmountInputProps {
  label?: string;
  /** 円・整数。未入力は null。 */
  value: number | null;
  onChange: (value: number | null) => void;
  autoFocus?: boolean;
  /** lg=主役（支出フォーム）、md=サブ（サブスクフォーム等）。 */
  size?: "lg" | "md";
}

const MAX_DIGITS = 8;

function withCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function AmountInput({
  label = "金額",
  value,
  onChange,
  autoFocus,
  size = "lg",
}: AmountInputProps) {
  const colors = useThemeColors();

  function handleChange(text: string) {
    const digits = text.replace(/[^\d]/g, "").slice(0, MAX_DIGITS);
    onChange(digits.length > 0 ? Number(digits) : null);
  }

  return (
    <View className="gap-1">
      <Text className="text-xs text-text-secondary">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-border bg-surface-raised px-4">
        <Text
          className={cn(
            "font-bold text-text-muted",
            size === "lg" ? "text-2xl" : "text-lg",
          )}
        >
          ¥
        </Text>
        <TextInput
          value={value != null ? withCommas(value) : ""}
          onChangeText={handleChange}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          accessibilityLabel={label}
          className="flex-1 py-3 pl-1 font-bold text-text-primary"
          // text-2xl 等は lineHeight を伴い、iOS の TextInput は lineHeight があると
          // テキストが縦中央からずれるため、サイズは fontSize のみ style で当てる。
          style={{
            fontVariant: ["tabular-nums"],
            fontSize: size === "lg" ? 24 : 18,
          }}
        />
      </View>
    </View>
  );
}
