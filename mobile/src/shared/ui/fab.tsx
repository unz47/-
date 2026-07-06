import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet, View } from "react-native";

import { useThemeColors } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";
import { hapticLight } from "@/shared/lib/haptics";

/**
 * FAB（画面右下の主アクション）。iOS 26+ では Liquid Glass、
 * 非対応環境は従来どおり accent の円にフォールバックする。
 */
interface FabProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  /** 位置の上書き（既定: bottom-8 right-6）。 */
  className?: string;
}

const GLASS = isLiquidGlassAvailable();

export function Fab({
  onPress,
  icon = "add",
  accessibilityLabel,
  className,
}: FabProps) {
  const colors = useThemeColors();

  function handlePress() {
    hapticLight();
    onPress();
  }

  if (GLASS) {
    return (
      <View
        className={cn("absolute bottom-8 right-6", className)}
        style={styles.shadow}
      >
        <GlassView style={styles.glass} glassEffectStyle="regular" isInteractive>
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={styles.press}
          >
            <Ionicons name={icon} size={28} color={colors.accent} />
          </Pressable>
        </GlassView>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg active:opacity-80",
        className,
      )}
    >
      <Ionicons name={icon} size={28} color={colors.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  press: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
